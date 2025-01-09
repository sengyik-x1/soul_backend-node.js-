const ServiceType = require('../model/ServiceType');


const getServiceID = async (req, res) => {
    const { name } = req.params;
    try {
        const service = await ServiceType.findOne({ name });
        res.status(200).json(service);
    } catch (error) {
        console.error('Error fetching service:', error.message);
        res.status(500).json({ error: 'Error fetching service' });
    }
};

const getAllServices = async (req, res) => {
    try {
        const services = await ServiceType.find({});
        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching services:', error.message);
        res.status(500).json({ error: 'Error fetching services' });
    }
};

//create nrew service
const createService = async (req, res) => {
    const { name, description } = req.body;
    try {
        const newService = new ServiceType({ name, description });
        await newService.save();
        res.status(201).send('Service saved successfully');
    } catch (error) {
        res.status(400).send('Error saving service');
    }
}

//update service
const updateService = async (req, res) => {
    const { name, description } = req.body;
    try {
        const service = await ServiceType.findOne({ name });
        service.description = description;
        await service.save();
        res.status(200).send('Service updated successfully');
    } catch (error) {
        console.error('Error updating service:', error.message);
        res.status(500).send('Error updating service');
    }
}

//delete service
const deleteService = async (req, res) => {
    const { name } = req.params;
    try {
        await ServiceType.deleteOne({ name });
        res.status(200).send('Service deleted successfully');
    } catch (error) {
        console.error('Error deleting service:', error.message);
        res.status(500).send('Error deleting service');
    }
}

module.exports = { getServiceID, getAllServices, createService, updateService, deleteService };
