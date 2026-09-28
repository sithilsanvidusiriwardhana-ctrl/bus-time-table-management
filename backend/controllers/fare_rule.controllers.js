import { FareRule, DEFAULT_FARE_RULES } from '../modules/fare_rule.modules.js';

export async function getFareRules(req, res) {
    try {
        let rules = await FareRule.find().sort({ stage_number: 1 }).lean();
        if (!rules || rules.length === 0) {
            await FareRule.insertMany(DEFAULT_FARE_RULES);
            rules = await FareRule.find().sort({ stage_number: 1 }).lean();
        }
        res.status(200).json({ rules });
    } catch (error) {
        res.status(500).json({ message: 'Error loading fare rules.', error: error.message });
    }
}

export async function createFareRule(req, res) {
    try {
        const { stage_number, max_km, price } = req.body;
        if (stage_number === undefined || max_km === undefined || price === undefined) {
            return res.status(400).json({ message: 'Stage number, max km, and price are required.' });
        }
        const rule = await FareRule.create({
            stage_number: Number(stage_number),
            max_km: Number(max_km),
            price: Number(price),
        });
        res.status(201).json({ message: 'Fare rule created successfully.', rule });
    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({
            message: error.code === 11000 ? 'Stage number already exists.' : 'Error creating fare rule.',
            error: error.message,
        });
    }
}

export async function updateFareRule(req, res) {
    try {
        const { stage_number, max_km, price } = req.body;
        const rule = await FareRule.findById(req.params.id);
        if (!rule) {
            return res.status(404).json({ message: 'Fare rule not found.' });
        }
        if (stage_number !== undefined) rule.stage_number = Number(stage_number);
        if (max_km !== undefined) rule.max_km = Number(max_km);
        if (price !== undefined) rule.price = Number(price);
        await rule.save();
        res.status(200).json({ message: 'Fare rule updated successfully.', rule });
    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({
            message: error.code === 11000 ? 'Stage number already exists.' : 'Error updating fare rule.',
            error: error.message,
        });
    }
}

export async function deleteFareRule(req, res) {
    try {
        const rule = await FareRule.findByIdAndDelete(req.params.id);
        if (!rule) {
            return res.status(404).json({ message: 'Fare rule not found.' });
        }
        res.status(200).json({ message: 'Fare rule deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting fare rule.', error: error.message });
    }
}

export async function batchUpdateFareRules(req, res) {
    try {
        const { rules } = req.body;
        if (!Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ message: 'A valid list of fare rules is required.' });
        }

        // Validate and clean rules
        const cleanRules = rules.map((r, index) => ({
            stage_number: Number(r.stage_number || index + 1),
            max_km: Number(r.max_km || 0),
            price: Number(r.price || 0),
        })).sort((a, b) => a.stage_number - b.stage_number);

        await FareRule.deleteMany({});
        const inserted = await FareRule.insertMany(cleanRules);
        res.status(200).json({ message: 'Fare rules updated successfully.', rules: inserted });
    } catch (error) {
        res.status(500).json({ message: 'Error saving batch fare rules.', error: error.message });
    }
}
