const User = require('../model/User');

// Register a new user
const registerUser = async (req, res) => {
  const { uid, email, role } = req.body;

  try {
    const newUser = new User({ uid, email, role });
    const result = await newUser.save();
    console.log(result);
    res.status(201).json({ message: 'User registered successfully', newUser });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
};

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

module.exports = { registerUser, getAllUsers, getUserRole };
