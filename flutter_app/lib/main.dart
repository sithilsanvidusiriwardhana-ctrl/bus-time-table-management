import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://busmanagments.netlify.app/api',
);
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BusTableApp());
}

// ─── Data Models ────────────────────────────────────────────────────────────

class Schedule {
  Schedule({
    this.id,
    required this.route,
    required this.routeNumber,
    required this.bus,
    required this.driver,
    required this.departure,
    required this.arrival,
    required this.status,
    required this.type,
    required this.price,
    this.pendingStatus,
    this.pendingStatusDriver,
  });

  String? id;
  String? pendingStatus, pendingStatusDriver;
  String route, routeNumber, bus, driver, departure, arrival, status, type;
  int price;

  Map<String, dynamic> toJson() => {
    if (id != null) '_id': id,
    'route': route,
    'routeNumber': routeNumber,
    'bus': bus,
    'driver': driver,
    'departure': departure,
    'arrival': arrival,
    'status': status,
    'type': type,
    'price': price,
  };

  factory Schedule.fromJson(Map<String, dynamic> json) => Schedule(
    id: json['_id']?.toString() ?? json['id']?.toString(),
    route: json['route'] ?? json['route_name'] ?? '',
    routeNumber: json['routeNumber'] ?? json['route_number'] ?? '',
    bus: json['bus'] ?? json['bus_number'] ?? '',
    driver: json['driver'] ?? json['assign_driver'] ?? '',
    departure: json['departure'] ?? json['departure_time'] ?? '',
    arrival: json['arrival'] ?? json['arrival_time'] ?? '',
    status: json['status'] ?? 'On Time',
    pendingStatus: json['pending_status']?.toString(),
    pendingStatusDriver: json['pending_status_driver']?.toString(),
    type: json['type'] ?? json['bus_type'] ?? 'Normal',
    price: json['price'] ?? 0,
  );
}

class User {
  User(this.username, this.password, this.role, this.name);
  String username, password, role, name;
}

// ─── App Root ────────────────────────────────────────────────────────────────

class BusTableApp extends StatelessWidget {
  const BusTableApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Bus Time Table',
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff1769aa)),
      scaffoldBackgroundColor: const Color(0xfff4f8fc),
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
    ),
    home: const TableHome(),
  );
}

// ─── Home (login gate) ───────────────────────────────────────────────────────

class TableHome extends StatefulWidget {
  const TableHome({super.key});
  @override
  State<TableHome> createState() => _TableHomeState();
}

class _TableHomeState extends State<TableHome> {
  final List<User> users = [
    User('admin', 'admin123', 'Admin', 'Administrator'),
    User('driver', 'driver123', 'Driver', 'Bus Driver'),
    User('passenger', 'passenger123', 'Passenger', 'Passenger'),
  ];

  List<Schedule> schedules = [];
  List<User> drivers = [];
  User? currentUser;

  final username = TextEditingController();
  final password = TextEditingController();
  final search = TextEditingController();
  final route = TextEditingController();
  final routeNumber = TextEditingController();
  final bus = TextEditingController();
  final departure = TextEditingController();
  final arrival = TextEditingController();
  final driverName = TextEditingController();
  final driverUsername = TextEditingController();
  final driverPassword = TextEditingController();

  String statusFilter = 'All';
  String adminSection = 'schedules';
  String? selectedScheduleDriver;
  bool loading = true;
  bool refreshing = false;
  final statuses = const ['On Time', 'Delayed', 'Departed'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool refresh = false}) async {
    if (refresh && mounted) setState(() => refreshing = true);
    try {
      final scheduleResponse = await _getWithRetry(
        Uri.parse('$baseUrl/shedulle'),
      );
      if (scheduleResponse.statusCode != 200) {
        throw Exception(_apiError(scheduleResponse, 'Could not load schedules'));
      }
      final driverResponse = await _getWithRetry(
        Uri.parse('$baseUrl/drivers'),
      );
      if (driverResponse.statusCode != 200) {
        throw Exception(_apiError(driverResponse, 'Could not load drivers'));
      }
      final scheduleData =
          jsonDecode(scheduleResponse.body) as Map<String, dynamic>;
      final driverData =
          jsonDecode(driverResponse.body) as Map<String, dynamic>;
      schedules = (scheduleData['shedulles'] as List)
          .map((item) => Schedule.fromJson(item as Map<String, dynamic>))
          .toList();
      drivers = (driverData['drivers'] as List).map((item) {
        final data = item as Map<String, dynamic>;
        return User(data['username'] ?? '', '', 'Driver', data['name'] ?? '');
      }).toList();
    } catch (error) {
      _message('Could not load bus data. Check your connection and retry: $error');
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
          refreshing = false;
        });
      }
    }
  }

  Future<http.Response> _getWithRetry(Uri uri) async {
    for (var attempt = 0; attempt < 3; attempt++) {
      final client = http.Client();
      try {
        return await client.get(uri).timeout(const Duration(seconds: 15));
      } catch (_) {
        if (attempt == 2) rethrow;
      } finally {
        client.close();
      }
      await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
    }
    throw StateError('Request retry limit reached.');
  }

  void _message(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  String _apiError(http.Response response, String fallback) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic> && data['message'] is String) {
        return data['message'] as String;
      }
    } on FormatException {
      // The server may return plain text or an HTML error page.
    }
    final body = response.body.trim();
    return body.isEmpty
        ? '$fallback (HTTP ${response.statusCode})'
        : '$fallback (HTTP ${response.statusCode}: $body)';
  }

  Future<void> login() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username.text.trim(),
          'password': password.text,
        }),
      );
      if (response.statusCode != 200) {
        _message(_apiError(response, 'Login failed'));
        return;
      }
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final data = decoded['user'] as Map<String, dynamic>;
      final role = data['role'] as String? ?? 'Passenger';
      setState(
        () =>
            currentUser = User(data['username'], '', role, data['displayName']),
      );
      await _load(refresh: true);
    } catch (error) {
      _message('Login failed: $error');
    }
  }

  void logout() => setState(() {
    currentUser = null;
    username.clear();
    password.clear();
  });

  // ─── Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return currentUser == null ? _buildLogin() : _buildDashboard();
  }

  // ─── Login Screen ────────────────────────────────────────────────────────
  // Uses MediaQuery (not LayoutBuilder) — LayoutBuilder gives w=0 on Android
  // inside SingleChildScrollView causing "RenderFlex unbounded" crash.

  Widget _buildLogin() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 700;

    final heroPanel = Container(
      padding: const EdgeInsets.all(40),
      color: const Color(0xff155ea8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.directions_bus_filled, color: Colors.white, size: 42),
          SizedBox(height: 40),
          Text(
            'Explore the things\nyou love.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
            ),
          ),
          SizedBox(height: 16),
          Text(
            'Search routes, manage schedules,\nand sign in securely.',
            style: TextStyle(
              color: Color(0xffdceaf7),
              fontSize: 14,
              height: 1.6,
            ),
          ),
        ],
      ),
    );

    final formPanel = Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Log in',
            style: Theme.of(
              context,
            ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: username,
            decoration: const InputDecoration(
              labelText: 'Username',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Password',
              prefixIcon: Icon(Icons.lock_outline),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: login, child: const Text('Log in')),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _register,
              child: const Text('Create passenger account'),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Demo: admin/admin123 · driver/driver123 · passenger/passenger123',
            style: TextStyle(fontSize: 11, color: Colors.grey),
          ),
        ],
      ),
    );

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: isWide
                // Wide: side-by-side panels in a fixed-width card
                ? SizedBox(
                    width: 900,
                    child: Card(
                      clipBehavior: Clip.antiAlias,
                      child: IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(flex: 5, child: heroPanel),
                            Expanded(flex: 4, child: formPanel),
                          ],
                        ),
                      ),
                    ),
                  )
                // Narrow: stacked column — no flex children in unbounded parent
                : Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [heroPanel, formPanel],
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────

  Widget _buildDashboard() => Scaffold(
    appBar: AppBar(
      title: const Text(
        'BUS / TIME TABLE',
        style: TextStyle(fontWeight: FontWeight.w800),
      ),
      actions: [
        IconButton(
          onPressed: refreshing ? null : () => _load(refresh: true),
          tooltip: 'Refresh data',
          icon: refreshing
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.refresh),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Chip(label: Text(currentUser!.role)),
        ),
        IconButton(
          onPressed: logout,
          tooltip: 'Log out',
          icon: const Icon(Icons.logout),
        ),
      ],
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1180),
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              '${currentUser!.role} Dashboard',
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(
              'Welcome, ${currentUser!.name}.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            if (currentUser!.role == 'Admin') _adminPanel(),
            if (currentUser!.role == 'Driver') _driverPanel(),
            if (currentUser!.role == 'Passenger') _passengerPanel(),
          ],
        ),
      ),
    ),
  );

  // ─── Admin Panel ─────────────────────────────────────────────────────────

  Widget _adminPanel() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _statsRow(),
      const SizedBox(height: 16),
      SegmentedButton<String>(
        segments: const [
          ButtonSegment(
            value: 'schedules',
            label: Text('Schedules'),
            icon: Icon(Icons.directions_bus_outlined),
          ),
          ButtonSegment(
            value: 'drivers',
            label: Text('Drivers'),
            icon: Icon(Icons.groups_outlined),
          ),
        ],
        selected: {adminSection},
        onSelectionChanged: (selection) =>
            setState(() => adminSection = selection.first),
      ),
      const SizedBox(height: 20),
      if (adminSection == 'schedules') _adminSchedulesSection(),
      if (adminSection == 'drivers') _adminDriversSection(),
    ],
  );

  Widget _adminSchedulesSection() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _sectionTitle('Add Bus Schedule'),
      _scheduleForm(),
      const SizedBox(height: 24),
      _sectionTitle('All Schedules (${schedules.length})'),
      _scheduleTables(schedules, canDelete: true),
    ],
  );

  Widget _adminDriversSection() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _sectionTitle('Register Driver'),
      _driverForm(),
      const SizedBox(height: 24),
      _sectionTitle('All Drivers (${drivers.length})'),
      if (drivers.isEmpty)
        const Text('No drivers have been registered yet.')
      else
        ...drivers.map(
          (driver) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: Text(driver.name),
              subtitle: Text('@${driver.username}'),
            ),
          ),
        ),
    ],
  );

  Widget _statsRow() => Row(
    children: [
      _statCard('Schedules', '${schedules.length}'),
      _statCard('Drivers', '${drivers.length}'),
      _statCard(
        'Routes',
        '${schedules.map((s) => s.routeNumber).toSet().length}',
      ),
    ],
  );

  Widget _statCard(String label, String value) => Expanded(
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            Text(
              value,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _scheduleForm() => Wrap(
    spacing: 12,
    runSpacing: 12,
    children: [
      _field('Route', 'Central - Airport', controller: route),
      _field('Route No.', '12A', controller: routeNumber),
      _field('Bus No.', 'B-401', controller: bus),
      SizedBox(
        width: 240,
        child: DropdownButtonFormField<String>(
          initialValue: selectedScheduleDriver,
          decoration: InputDecoration(
            labelText: 'Registered driver',
            helperText: drivers.isEmpty ? 'Register a driver first' : null,
          ),
          items: drivers
              .map(
                (driver) => DropdownMenuItem(
                  value: driver.username,
                  child: Text('${driver.name} (@${driver.username})'),
                ),
              )
              .toList(),
          onChanged: drivers.isEmpty
              ? null
              : (username) => setState(() => selectedScheduleDriver = username),
        ),
      ),
      _field('Departure', '08:00', controller: departure),
      _field('Arrival', '09:00', controller: arrival),
      FilledButton.icon(
        onPressed: _addSchedule,
        icon: const Icon(Icons.add),
        label: const Text('Add Schedule'),
      ),
    ],
  );

  Widget _field(
    String label,
    String hint, {
    TextEditingController? controller,
  }) => SizedBox(
    width: 160,
    child: TextField(
      controller: controller,
      decoration: InputDecoration(labelText: label, hintText: hint),
    ),
  );

  Future<void> _addSchedule() async {
    final payload = {
      'route_name': route.text.trim(),
      'route_number': routeNumber.text.trim(),
      'bus_number': bus.text.trim(),
      'assign_driver': selectedScheduleDriver ?? '',
      'departure_time': departure.text.trim(),
      'arrival_time': arrival.text.trim(),
      'status': 'On Time',
      'bus_type': 'Normal',
      'price': 0,
    };
    if (payload.values.any((value) => value is String && value.isEmpty)) {
      _message('Fill in all schedule fields.');
      return;
    }
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/shedulle/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );
      if (response.statusCode != 201) {
        _message(
          jsonDecode(response.body)['message'] ?? 'Could not add schedule.',
        );
        return;
      }
      schedules.add(Schedule.fromJson(jsonDecode(response.body)['shedulle']));
      setState(() {});
      for (final controller in [
        route,
        routeNumber,
        bus,
        departure,
        arrival,
      ]) {
        controller.clear();
      }
      setState(() => selectedScheduleDriver = null);
      _message('Schedule added.');
    } catch (error) {
      _message('Could not add schedule: $error');
    }
  }

  Widget _driverForm() => Wrap(
    spacing: 12,
    runSpacing: 12,
    children: [
      _field('Full Name', 'Full Name', controller: driverName),
      _field('Username', 'Username', controller: driverUsername),
      _field('Password', 'Password', controller: driverPassword),
      OutlinedButton.icon(
        onPressed: _addDriver,
        icon: const Icon(Icons.person_add),
        label: const Text('Create Driver'),
      ),
    ],
  );

  Future<void> _addDriver() async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/drivers/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': driverName.text.trim(),
          'username': driverUsername.text.trim(),
          'password': driverPassword.text,
        }),
      );
      if (response.statusCode != 201) {
        _message(
          jsonDecode(response.body)['message'] ?? 'Could not create driver.',
        );
        return;
      }
      final data = jsonDecode(response.body)['driver'] as Map<String, dynamic>;
      drivers.add(User(data['username'], '', 'Driver', data['name']));
      setState(() {});
      driverName.clear();
      driverUsername.clear();
      driverPassword.clear();
      _message('Driver account created.');
    } catch (error) {
      _message('Could not create driver: $error');
    }
  }

  // ─── Driver Panel ─────────────────────────────────────────────────────────

  Widget _driverPanel() {
    final driverIdentifiers = {
      currentUser!.username.trim().toLowerCase(),
      currentUser!.name.trim().toLowerCase(),
      currentUser!.name.trim().split(' ').first.toLowerCase(),
    };
    final mySchedules = schedules.where(
      (schedule) =>
          driverIdentifiers.contains(schedule.driver.trim().toLowerCase()),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Your Schedule Board'),
        _scheduleTables(mySchedules.toList()),
      ],
    );
  }

  // ─── Passenger Panel ──────────────────────────────────────────────────────

  Widget _passengerPanel() {
    final filtered = schedules
        .where(
          (s) =>
              (s.route.toLowerCase().contains(search.text.toLowerCase()) ||
                  s.routeNumber.toLowerCase().contains(
                    search.text.toLowerCase(),
                  )) &&
              (statusFilter == 'All' || s.status == statusFilter),
        )
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Passenger Travel Board'),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: search,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  labelText: 'Search route or number',
                ),
              ),
            ),
            const SizedBox(width: 12),
            DropdownButton<String>(
              value: statusFilter,
              items: [
                'All',
                ...statuses,
              ].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: (v) => setState(() => statusFilter = v!),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _scheduleTables(filtered),
      ],
    );
  }

  // ─── Shared Widgets ───────────────────────────────────────────────────────

  Widget _sectionTitle(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(
      title,
      style: Theme.of(
        context,
      ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
    ),
  );

  Widget _scheduleTables(List<Schedule> items, {bool canDelete = false}) {
    if (items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Text('No schedules available.'),
      );
    }

    final groups = <String, List<Schedule>>{};
    for (final item in items) {
      final key = '${item.routeNumber.trim()}\u0000${item.route.trim()}';
      groups.putIfAbsent(key, () => []).add(item);
    }
    final routes = groups.values.toList()
      ..sort((first, second) {
        final numberOrder = first.first.routeNumber.compareTo(
          second.first.routeNumber,
        );
        return numberOrder != 0
            ? numberOrder
            : first.first.route.compareTo(second.first.route);
      });

    return Column(
      children: routes.map((routeSchedules) {
        final route = routeSchedules.first;
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                child: Text(
                  'Route ${route.routeNumber}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: const Color(0xff1769aa),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  route.route,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
                child: DataTable(
                  headingRowHeight: 44,
                  dataRowMinHeight: 54,
                  dataRowMaxHeight: 64,
                  columnSpacing: 24,
                  columns: [
                    const DataColumn(label: Text('Route')),
                    const DataColumn(label: Text('Bus')),
                    const DataColumn(label: Text('Driver')),
                    const DataColumn(label: Text('Departure')),
                    const DataColumn(label: Text('Arrival')),
                    const DataColumn(label: Text('Status')),
                    const DataColumn(label: Text('Fare'), numeric: true),
                    if (canDelete || currentUser!.role != 'Passenger')
                      const DataColumn(label: Text('Actions')),
                  ],
                  rows: routeSchedules.map((item) {
                    return DataRow(
                      cells: [
                        DataCell(
                          Text('${item.routeNumber} • ${item.route}'),
                        ),
                        DataCell(Text(item.bus)),
                        DataCell(Text(_assignedDriverLabel(item.driver))),
                        DataCell(Text(item.departure)),
                        DataCell(Text(item.arrival)),
                        DataCell(_statusBadge(item.status)),
                        DataCell(Text(_formatFare(item.price))),
                        if (canDelete || currentUser!.role != 'Passenger')
                          DataCell(
                            Wrap(
                              spacing: 0,
                              children: [
                                if (currentUser!.role == 'Driver')
                                  PopupMenuButton<String>(
                                    tooltip: 'Update trip status',
                                    enabled: item.pendingStatus == null,
                                    onSelected: (status) =>
                                        _requestStatus(item, status),
                                    itemBuilder: (_) => statuses
                                        .map(
                                          (status) => PopupMenuItem(
                                            value: status,
                                            child: Text(status),
                                          ),
                                        )
                                        .toList(),
                                  ),
                                if (currentUser!.role == 'Admin' &&
                                    item.pendingStatus != null)
                                  IconButton(
                                    tooltip:
                                        'Approve ${item.pendingStatus} status',
                                    onPressed: () => _approveStatus(item),
                                    icon: const Icon(
                                      Icons.check_circle_outline,
                                    ),
                                  ),
                                if (canDelete)
                                  IconButton(
                                    tooltip: 'Delete schedule',
                                    onPressed: item.id == null
                                        ? null
                                        : () => _deleteSchedule(item),
                                    icon: const Icon(Icons.delete_outline),
                                  ),
                              ],
                            ),
                          ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _statusBadge(String status) {
    final colors = switch (status.toLowerCase()) {
      'on time' => (background: const Color(0xffe8f5e9), foreground: const Color(0xff2e7d32)),
      'delayed' => (background: const Color(0xfffff4df), foreground: const Color(0xffa86400)),
      'departed' => (background: const Color(0xffedf2ff), foreground: const Color(0xff3949ab)),
      _ => (background: const Color(0xffeef2f6), foreground: const Color(0xff455a64)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        status,
        style: TextStyle(color: colors.foreground, fontSize: 12),
      ),
    );
  }

  String _formatFare(int fare) {
    final digits = fare.toString();
    final formatted = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index > 0 && (digits.length - index) % 3 == 0) {
        formatted.write(',');
      }
      formatted.write(digits[index]);
    }
    return formatted.toString();
  }

  String _assignedDriverLabel(String assignedDriver) {
    final normalized = assignedDriver.trim().toLowerCase();
    for (final driver in drivers) {
      if (driver.username.trim().toLowerCase() == normalized ||
          driver.name.trim().toLowerCase() == normalized) {
        return '${driver.name} (@${driver.username})';
      }
    }
    return assignedDriver;
  }

  Future<void> _requestStatus(Schedule item, String status) async {
    if (item.id == null) return;
    try {
      final response = await http.post(
        Uri.parse(
          '$baseUrl/shedulle/${Uri.encodeComponent(item.id!)}/status-request',
        ),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': status,
          'driver_username': currentUser!.username,
        }),
      );
      if (response.statusCode != 200) {
        _message(_apiError(response, 'Could not request status update.'));
        return;
      }
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final updated = Schedule.fromJson(
        data['shedulle'] as Map<String, dynamic>,
      );
      setState(() => schedules[schedules.indexOf(item)] = updated);
      _message('Status sent to an admin for approval.');
    } catch (error) {
      _message('Could not request status update: $error');
    }
  }

  Future<void> _approveStatus(Schedule item) async {
    if (item.id == null) return;
    try {
      final response = await http.post(
        Uri.parse(
          '$baseUrl/shedulle/${Uri.encodeComponent(item.id!)}/status-approve',
        ),
      );
      if (response.statusCode != 200) {
        _message(_apiError(response, 'Could not approve status update.'));
        return;
      }
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final updated = Schedule.fromJson(
        data['shedulle'] as Map<String, dynamic>,
      );
      setState(() => schedules[schedules.indexOf(item)] = updated);
      _message('Status approved.');
    } catch (error) {
      _message('Could not approve status update: $error');
    }
  }

  void _register() {
    final name = TextEditingController();
    final user = TextEditingController();
    final pass = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Create Passenger Account'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _fieldController(name, 'Full Name'),
            _fieldController(user, 'Username'),
            _fieldController(pass, 'Password'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                final response = await http.post(
                  Uri.parse('$baseUrl/passengers/register'),
                  headers: {'Content-Type': 'application/json'},
                  body: jsonEncode({
                    'name': name.text.trim(),
                    'username': user.text.trim(),
                    'password': pass.text,
                  }),
                );
                if (response.statusCode != 201) {
                  _message(
                    jsonDecode(response.body)['message'] ??
                        'Could not create account.',
                  );
                  return;
                }
                if (mounted) Navigator.pop(context);
                _message('Account created. You can now log in.');
              } catch (error) {
                _message('Could not create account: $error');
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteSchedule(Schedule item) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/shedulle/${item.id}'),
      );
      if (response.statusCode != 200) {
        _message(
          jsonDecode(response.body)['message'] ?? 'Could not remove schedule.',
        );
        return;
      }
      setState(() => schedules.remove(item));
      _message('Schedule removed.');
    } catch (error) {
      _message('Could not remove schedule: $error');
    }
  }

  Widget _fieldController(TextEditingController ctrl, String label) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: ctrl,
      decoration: InputDecoration(labelText: label),
    ),
  );
}
