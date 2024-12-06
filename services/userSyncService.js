const admin = require("firebase-admin");
const User = require("../model/User"); // Your MongoDB User model

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
        listUsersResult.users.map((user) => ({
          uid: user.uid,
          email: user.email,
          createdAt: user.metadata.creationTime,
        }))
      );
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Total users fetched from Firebase: ${firebaseUsers.length}`);

    // Step 2: Upsert Firebase users into MongoDB
    const firebaseUserIds = [];
    for (const firebaseUser of firebaseUsers) {
      const { uid, email, createdAt } = firebaseUser;

      firebaseUserIds.push(uid); // Collect Firebase user IDs for deletion check

      // Upsert user in MongoDB
      await User.findOneAndUpdate(
        { uid },
        {
          $setOnInsert: {
            uid,
            email,
            createdAt,
            role: "client", // Default role
          },
        },
        { upsert: true }
      );
    }

    // Step 3: Fetch all MongoDB users
    const mongoDBUsers = await User.find({}, { uid: 1 }); // Fetch only `uid` field
    const mongoUserIds = mongoDBUsers.map((user) => user.uid);

    // Step 4: Find users in MongoDB but not in Firebase
    const usersToDelete = mongoUserIds.filter((uid) => !firebaseUserIds.includes(uid));

    console.log(`Users to delete from MongoDB: ${usersToDelete.length}`);

    // Step 5: Delete users from MongoDB
    if (usersToDelete.length > 0) {
      await User.deleteMany({ uid: { $in: usersToDelete } });
      console.log(`Deleted ${usersToDelete.length} users from MongoDB.`);
    }

    console.log("User sync completed successfully.");
  } catch (error) {
    console.error("Error syncing users:", error);
    throw error; // Re-throw for error handling in the job
  }
}

module.exports = { syncAllUsers };
