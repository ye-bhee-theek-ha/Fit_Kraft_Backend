const express = require("express");
const {getUser,CreateUser,DeleteUser,UpdateUser,loginUser,checkOnboardingStatus, Onboarding,getUserBadges,createBadge,assignBadgeToUser,createMentalScore,updateUserMentalScore}=require('../controllers/Usercontroller')

const {CreateNotification,GetNotification,DeleteNotificationById}=require('../controllers/NotificatoinController')
const calculateMetrics = require('../middleware/calculateMetrics');
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.route('/get').get(protect, getUser)
router.route('/create').post(CreateUser)
router.route('/onboard').post(protect, Onboarding)
router.route('/delete').delete(protect, DeleteUser)
router.route('/update/user/:userId').patch(protect, calculateMetrics, UpdateUser)
router.route('/login').post(loginUser);
router.get('/onboarding-status', protect, checkOnboardingStatus);
router.get('/getbadges/:userId',getUserBadges)
router.post('/createbadge',createBadge)
router.put('/updateuserbadges/:userid/:badgeid',assignBadgeToUser)
router.get('/GetNotification/user/:userId',GetNotification)
router.post('/CreateNotification',CreateNotification)
router.delete('/DeleteNotification/Notification/:notificationId',DeleteNotificationById)
router.post('/CreateMentallScore/:userId',createMentalScore)
router.put('/UpdateMentalScore/:userIdentifier',updateUserMentalScore)


module.exports=router  






