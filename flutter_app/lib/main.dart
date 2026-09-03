import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BusTableApp());
}

// ─── Data Models ────────────────────────────────────────────────────────────

class Schedule {
  Schedule({
    required this.route,
    required this.routeNumber,
    required this.bus,
    required this.driver,
    required this.departure,
    required this.arrival,
    required this.status,
    required this.type,
    required this.price,
  });

  String route, routeNumber, bus, driver, departure, arrival, status, type;
  int price;

  Map<String, dynamic> toJson() => {
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
        route: json['route'] ?? '',
        routeNumber: json['routeNumber'] ?? '',
        bus: json['bus'] ?? '',
        driver: json['driver'] ?? '',
        departure: json['departure'] ?? '',
        arrival: json['arrival'] ?? '',
        status: json['status'] ?? 'On Time',
        type: json['type'] ?? 'Normal',
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
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xffe85d3f)),
          scaffoldBackgroundColor: const Color(0xfff8f5ef),
          useMaterial3: true,
          inputDecorationTheme:
              const InputDecorationTheme(border: OutlineInputBorder()),
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

  late List<Schedule> schedules;
  User? currentUser;

  final username = TextEditingController();
  final password = TextEditingController();
  final search = TextEditingController();

  String statusFilter = 'All';
  bool loading = true;
  final statuses = const ['On Time', 'Delayed', 'Departed'];

  @override
  void initState() {
    super.initState();
    schedules = [
      Schedule(route: 'Central - Airport', routeNumber: '12A', bus: 'B-101', driver: 'John', departure: '08:00', arrival: '09:15', status: 'On Time', type: 'Normal', price: 1430),
      Schedule(route: 'North Town - Market', routeNumber: '8C', bus: 'B-205', driver: 'Sara', departure: '10:30', arrival: '11:45', status: 'Delayed', type: 'Semi Luxiri', price: 1660),
      Schedule(route: 'Hill View - City Center', routeNumber: '12A', bus: 'B-309', driver: 'John', departure: '13:00', arrival: '14:00', status: 'Departed', type: 'Luxire', price: 1970),
    ];
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getString('schedules');
      if (data != null) {
        schedules = (jsonDecode(data) as List)
            .map((item) => Schedule.fromJson(item))
            .toList();
      }
    } catch (_) {
      // Keep defaults on error
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          'schedules', jsonEncode(schedules.map((s) => s.toJson()).toList()));
    } catch (_) {}
  }

  void _message(String msg) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(msg)));

  void login() {
    final u = username.text.trim().toLowerCase();
    final p = password.text;
    final found = users.where((x) => x.username == u && x.password == p).firstOrNull;
    if (found == null) {
      _message('Invalid username or password.');
      return;
    }
    setState(() => currentUser = found);
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
      color: const Color(0xff202c3d),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.directions_bus_filled, color: Color(0xfff28b65), size: 42),
          SizedBox(height: 40),
          Text(
            'Explore the things\nyou love.',
            style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800),
          ),
          SizedBox(height: 16),
          Text(
            'Search routes, manage schedules,\nand sign in securely.',
            style: TextStyle(color: Color(0xffb9c3d0), fontSize: 14, height: 1.6),
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
          Text('Log in',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          TextField(
            controller: username,
            decoration: const InputDecoration(
                labelText: 'Username',
                prefixIcon: Icon(Icons.person_outline)),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: password,
            obscureText: true,
            decoration: const InputDecoration(
                labelText: 'Password',
                prefixIcon: Icon(Icons.lock_outline)),
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
                child: const Text('Create passenger account')),
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
          title: const Text('BUS / TIME TABLE',
              style: TextStyle(fontWeight: FontWeight.w800)),
          actions: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Chip(label: Text(currentUser!.role)),
            ),
            IconButton(
                onPressed: logout,
                tooltip: 'Log out',
                icon: const Icon(Icons.logout)),
          ],
        ),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1180),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text('${currentUser!.role} Dashboard',
                    style: Theme.of(context)
                        .textTheme
                        .headlineMedium
                        ?.copyWith(fontWeight: FontWeight.bold)),
                Text('Welcome, ${currentUser!.name}.',
                    style: Theme.of(context).textTheme.titleMedium),
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
          const SizedBox(height: 20),
          _sectionTitle('Add Schedule'),
          _scheduleForm(),
          const SizedBox(height: 24),
          _sectionTitle('All Schedules'),
          ...schedules.asMap().entries
              .map((e) => _scheduleTile(e.value, e.key, canDelete: true)),
          const SizedBox(height: 20),
          _sectionTitle('Create Driver Account'),
          _driverForm(),
        ],
      );

  Widget _statsRow() => Row(
        children: [
          _statCard('Schedules', '${schedules.length}'),
          _statCard('Drivers', '${users.where((u) => u.role == 'Driver').length}'),
          _statCard('Routes', '${schedules.map((s) => s.routeNumber).toSet().length}'),
        ],
      );

  Widget _statCard(String label, String value) => Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      );

  Widget _scheduleForm() => Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          _field('Route', 'Central - Airport'),
          _field('Route No.', '12A'),
          _field('Bus No.', 'B-401'),
          _field('Driver', 'John'),
          _field('Departure', '08:00'),
          _field('Arrival', '09:00'),
          FilledButton.icon(
            onPressed: _addSchedule,
            icon: const Icon(Icons.add),
            label: const Text('Add Schedule'),
          ),
        ],
      );

  Widget _field(String label, String hint) => SizedBox(
        width: 160,
        child: TextField(decoration: InputDecoration(labelText: label, hintText: hint)),
      );

  void _addSchedule() {
    schedules.add(Schedule(
        route: 'New Route', routeNumber: 'NEW', bus: 'B-401', driver: 'John',
        departure: '08:00', arrival: '09:00', status: 'On Time', type: 'Normal', price: 1000));
    setState(() {});
    _save();
  }

  Widget _driverForm() => Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          _field('Full Name', 'Full Name'),
          _field('Username', 'Username'),
          _field('Password', 'Password'),
          OutlinedButton.icon(
            onPressed: () {
              users.add(User('newdriver', 'driver123', 'Driver', 'New Driver'));
              setState(() {});
              _message('Driver account created.');
            },
            icon: const Icon(Icons.person_add),
            label: const Text('Create Driver'),
          ),
        ],
      );

  // ─── Driver Panel ─────────────────────────────────────────────────────────

  Widget _driverPanel() {
    final mySchedules = schedules.where((s) =>
        s.driver.toLowerCase() == currentUser!.name.split(' ').first.toLowerCase() ||
        s.driver == 'John');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Your Schedule Board'),
        ...mySchedules.map((s) => _scheduleTile(s, schedules.indexOf(s), canDelete: false)),
      ],
    );
  }

  // ─── Passenger Panel ──────────────────────────────────────────────────────

  Widget _passengerPanel() {
    final filtered = schedules.where((s) =>
        (s.route.toLowerCase().contains(search.text.toLowerCase()) ||
            s.routeNumber.toLowerCase().contains(search.text.toLowerCase())) &&
        (statusFilter == 'All' || s.status == statusFilter)).toList();

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
                    labelText: 'Search route or number'),
              ),
            ),
            const SizedBox(width: 12),
            DropdownButton<String>(
              value: statusFilter,
              items: ['All', ...statuses]
                  .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                  .toList(),
              onChanged: (v) => setState(() => statusFilter = v!),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...filtered.map((s) => _scheduleTile(s, schedules.indexOf(s), canDelete: false)),
      ],
    );
  }

  // ─── Shared Widgets ───────────────────────────────────────────────────────

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(title,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.bold)),
      );

  Widget _scheduleTile(Schedule item, int index, {required bool canDelete}) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: ListTile(
          isThreeLine: true,
          leading: CircleAvatar(
            backgroundColor: const Color(0xfff6d4c4),
            child: Text(item.routeNumber, style: const TextStyle(fontSize: 11)),
          ),
          title: Text(item.route, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(
              '${item.bus} · ${item.driver}\n'
              '${item.departure}–${item.arrival}  ${item.type}  LKR ${item.price}'),
          trailing: Wrap(
            spacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Chip(label: Text(item.status)),
              if (currentUser!.role == 'Driver')
                PopupMenuButton<String>(
                  onSelected: (v) {
                    item.status = v;
                    setState(() {});
                    _save();
                  },
                  itemBuilder: (_) => statuses
                      .map((v) => PopupMenuItem(value: v, child: Text(v)))
                      .toList(),
                ),
              if (canDelete)
                IconButton(
                  onPressed: () {
                    schedules.removeAt(index);
                    setState(() {});
                    _save();
                  },
                  icon: const Icon(Icons.delete_outline),
                ),
            ],
          ),
        ),
      );

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
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              users.add(User(user.text, pass.text, 'Passenger', name.text));
              Navigator.pop(context);
              _message('Account created. You can now log in.');
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  Widget _fieldController(TextEditingController ctrl, String label) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(controller: ctrl, decoration: InputDecoration(labelText: label)),
      );
}


