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

module.exports = { getServiceID, getAllServices };
