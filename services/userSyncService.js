const admin = require("firebase-admin");
const User = require("../model/User"); // MongoDB User model
const Client = require("../model/Client"); // MongoDB Client model
const Admin = require("../model/Admin"); // MongoDB Admin model
const Trainer = require("../model/Trainer"); // MongoDB Trainer model

// Sync all Firebase Authentication users to MongoDB
async function syncAllUsers() {
  try {
    console.log("Starting user sync...");

    // Step 1: Fetch all Firebase users
    let firebaseUsers = [];
    let nextPageToken;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      firebaseUsers = firebaseUsers.concat(
        listUsersResult.users
          .filter((user) => user.emailVerified) // Only include verified users
          .map((user) => ({
            uid: user.uid,
            email: user.email,
            createdAt: user.metadata.creationTime,
          }))
      );
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Total verified users fetched from Firebase: ${firebaseUsers.length}`);

    // Step 2: Upsert Firebase users into MongoDB
    const firebaseUserIds = [];
    for (const firebaseUser of firebaseUsers) {
      const { uid, email, createdAt } = firebaseUser;

      firebaseUserIds.push(uid); // Collect Firebase user IDs for deletion check

      // Check and upsert user in MongoDB
      const existingUser = await User.findOne({ uid });
      const role = existingUser?.role || "client"; // Default to client role for new users

      const user = await User.findOneAndUpdate(
        { uid },
        {
          $set: {
            email,
            role,
          },
          $setOnInsert: {
            createdAt,
          },
        },
        { upsert: true, new: true } // Return the updated or newly inserted document
      );

      // Step 3: Handle Role-Specific Collections
      await handleRoleChange(user, role);
    }

    // Step 4: Fetch all MongoDB users
    const mongoDBUsers = await User.find({}, { uid: 1 }); // Fetch only `uid` field
    const mongoUserIds = mongoDBUsers.map((user) => user.uid);

    // Step 5: Find users in MongoDB but not in Firebase
    const usersToDelete = mongoUserIds.filter((uid) => !firebaseUserIds.includes(uid));

    console.log(`Users to delete from MongoDB: ${usersToDelete.length}`);

    // Step 6: Delete users from MongoDB
    if (usersToDelete.length > 0) {
      await User.deleteMany({ uid: { $in: usersToDelete } });

      // Delete from role-specific collections
      await Client.deleteMany({ client_uid: { $in: usersToDelete } });
      await Admin.deleteMany({ admin_uid: { $in: usersToDelete } });
      await Trainer.deleteMany({ trainer_uid: { $in: usersToDelete } });

      console.log(`Deleted ${usersToDelete.length} users from MongoDB.`);
    }

    console.log("User sync completed successfully.");
  } catch (error) {
    console.error("Error syncing users:", error);
    throw error; // Re-throw for error handling in the job
  }
}

// Function to handle role changes and role-specific data
async function handleRoleChange(user, currentRole) {
  const { uid, role: newRole } = user;

  // If the role hasn't changed, ensure the role-specific record exists
  if (currentRole === newRole) {
    if (newRole === "client") {
      const existingClient = await Client.findOne({ client_uid: uid });
      if (!existingClient) {
        await Client.create({ client_uid: uid , email: user.email});
        console.log(`Client record created for user: ${user.email}`);
      }
    } else if (newRole === "admin") {
      const existingAdmin = await Admin.findOne({ admin_uid: uid });
      if (!existingAdmin) {
        await Admin.create({ admin_uid: uid, email: user.email });
        console.log(`Admin record created for user: ${user.email}`);
      }
    } else if (newRole === "trainer") {
      const existingTrainer = await Trainer.findOne({ trainer_uid: uid });
      if (!existingTrainer) {
        await Trainer.create({ trainer_uid: uid, email: user.email });
        console.log(`Trainer record created for user: ${user.email}`);
      }
    }
    return;
  }

  // If the role has changed, delete from the old collection and add to the new one
  console.log(`Role change detected for user ${uid}: ${currentRole} -> ${newRole}`);

  if (currentRole === "client") {
    await Client.deleteOne({ client_uid: uid });
    console.log(`Deleted client record for user: ${user.email}`);
  } else if (currentRole === "admin") {
    await Admin.deleteOne({ admin_uid: uid });
    console.log(`Deleted admin record for user: ${user.email}`);
  } else if (currentRole === "trainer") {
    await Trainer.deleteOne({ trainer_uid: uid });
    console.log(`Deleted trainer record for user: ${user.email}`);
  }

  if (newRole === "client") {
    await Client.create({ client_uid: uid });
    console.log(`Created new client record for user: ${user.email}`);
  } else if (newRole === "admin") {
    await Admin.create({ admin_uid: uid });
    console.log(`Created new admin record for user: ${user.email}`);
  } else if (newRole === "trainer") {
    await Trainer.create({ trainer_uid: uid });
    console.log(`Created new trainer record for user: ${user.email}`);
  }
}

module.exports = { syncAllUsers };
