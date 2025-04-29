const express = require("express");
const router = express.Router();

const {getMusicWellnessItems,getYogaWellnessItems,getSleepWellnessItems,getRelaxingVideosItems}=require('../controllers/MentallWellnessControllers')

router.get('/MUSIC',getMusicWellnessItems)
router.get('/YOGA',getYogaWellnessItems)
router.get('/BODY_SCANNING')
router.get('/SLEEP',getSleepWellnessItems)
router.get('/RELAXING_VIDEO',getRelaxingVideosItems)


module.exports=router