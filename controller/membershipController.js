const MembershipPackage = require('../model/MembershipPackages');
//get all memberships
const getAllMemberships = async (req, res) => {
    try {
        const memberships = await MembershipPackage.find({});
        res.status(200).json(memberships);
    } catch (error) {
        console.error('Error fetching memberships:', error.message);
        res.status(500).json({ error: 'Error fetching memberships' });
    }
};

//create new membership
const createMembership = async (req, res) => {
    const { name, price, durationMonths, points, description } = req.body;
    try {
        const newMembership = new MembershipPackage({ name, price, durationMonths, points, description });
        await newMembership.save();
        res.status(201).send('Membership saved successfully');
    } catch (error) {
        res.status(400).send('Error saving membership');
    }
}

//update membership
const updateMembership = async (req, res) => {
    const { name, price, durationMonths, points, description } = req.body;
    try {
        const membership = await MembershipPackage.findOne({ name });
        membership.price = price;
        membership.durationMonths = durationMonths;
        membership.points = points;
        membership.description = description;
        await membership.save();
        res.status(200).send('Membership updated successfully');
    } catch (error) {
        console.error('Error updating membership:', error.message);
        res.status(500).send('Error updating membership');
    }
}

//delete membership
const deleteMembership = async (req, res) => {
    const { name } = req.params;
    try {
        await MembershipPackage.deleteOne({ name });
        res.status(200).send('Membership deleted successfully');
    }
    catch (error) {
        console.error('Error deleting membership:', error.message);
        res.status(500).send('Error deleting membership');
    }
}

module.exports = { getAllMemberships, createMembership, updateMembership, deleteMembership };