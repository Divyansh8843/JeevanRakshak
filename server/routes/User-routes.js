const express = require("express");
const router = express.Router();
const userController = require("../controllers/user-controller");
const notifyController = require("../controllers/notify-controller");

router.post("/auth/google", userController.googleLogin);
router.get("/auth/google/redirect", userController.googleRedirectInitiate);
router.get("/auth/google/callback", userController.googleRedirectCallback);
router.get("/auth/me", userController.me);
router.post("/auth/logout", userController.logout);
router.put("/user/profile", userController.updateProfile);
router.get("/user/profile", userController.getProfile);
// Image upload route removed - using Google profile images only
router.get("/counselors", userController.listCounselors);
router.get("/counselors/me", userController.getMyCounselorProfile);
router.put("/counselors/me", userController.updateMyCounselorProfile);
router.get("/counselors/stats", userController.getCounselorStats);
router.get("/counselors/activity", userController.getCounselorActivity);
router.get("/counselors/clients", userController.getCounselorClients);
router.get("/counselors/conversations", userController.getCounselorConversations);
router.get("/counselors/settings", userController.getCounselorSettings);
router.put("/counselors/settings", userController.updateCounselorSettings);
router.get("/counselors/appointments", userController.getCounselorAppointments);
router.get("/counselors/earnings", userController.getCounselorEarnings);
router.get("/counselors/resources", userController.getCounselorResources);
router.post("/notify/parent", notifyController.sendParentNotification);
router.post("/notify/parent/email", notifyController.sendParentEmailNotification);
router.post("/notify/parent/sms", notifyController.sendParentSMSNotification);

module.exports = router;
