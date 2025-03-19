const User = require('../model/User');
const deviceTokens = new Map();
const admin = require('firebase-admin');

// Register a new user
const registerUser = async (req, res) => {
  const { uid, email, role } = req.body;

  try {
    const newUser = new User({ uid, email, role });
    const result = await newUser.save();
    console.log("The result is: " + result);
    res.status(201).json({ message: 'User registered successfully', newUser });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
};

const registerFCMToken = async (req, res) => {
  try {
    const { fcmToken, userId} = req.body;
    
    if (!fcmToken || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store the token with the user ID
    const user = await User.findOneAndUpdate({ uid: userId }, { fcmToken }, { new: true });
    if (!user) {
      console.error('Cant find user with uid:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Registered device token for user ${userId}`);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
};

//get user role
const getUserRole = async (req, res) => { 
  try{

    const user = await User.findOne({uid: req.user.uid});

    if (!user) {
      console.error('Cant find user with uid:', req.user.uid);
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({role: user.role});

  }catch(error){
    console.error('Error fetching user role:', error.message);
    res.status(500).json({ error: 'Error fetching user role' });
  }
};

module.exports = { registerUser, registerFCMToken, getAllUsers, getUserRole };
