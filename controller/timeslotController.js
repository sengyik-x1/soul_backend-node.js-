const Trainer = require('../model/Trainer');

// Fetch available timeslots for a trainer
const getAvailableTimeslots = async (req, res) => {
    const { trainerId } = req.params;
  
    if (!trainerId) {
      return res.status(400).json({ error: 'Trainer ID is required' });
    }
  
    try {
      const trainer = await Trainer.findOne({ userId: trainerId });
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }
  
      const availableTimeslots = trainer.timeslots.filter(timeslot => timeslot.isAvailable);
      res.status(200).json(availableTimeslots);
    } catch (error) {
      console.error('Error fetching available timeslots:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = {
    getAvailableTimeslots,
    // other exports...
  };

// Update timeslot availability for a trainer
const updateTimeslotAvailability = async (req, res) => {
    const { timeslotId, isAvailable } = req.body;
  
    if (!timeslotId || typeof isAvailable === 'undefined') {
      return res.status(400).json({ error: 'Timeslot ID and availability status are required' });
    }
  
    try {
      const updatedTimeslot = await Timeslot.findByIdAndUpdate(
        timeslotId,
        { isAvailable },
        { new: true }
      );
  
      if (!updatedTimeslot) {
        return res.status(404).json({ error: 'Timeslot not found' });
      }
  
      res.status(200).json({ message: 'Timeslot updated successfully', updatedTimeslot });
    } catch (error) {
      console.error('Error updating timeslot:', error.message);
      res.status(500).json({ error: 'Error updating timeslot' });
    }
  };

module.exports = { getAvailableTimeslots, updateTimeslotAvailability };
