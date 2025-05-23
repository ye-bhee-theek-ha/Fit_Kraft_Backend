const express = require("express");
const router = express.Router();

const {getMusicWellnessItems,getYogaWellnessItems,getSleepWellnessItems,getRelaxingVideosItems,createPlaylist,getPlaylistByName,createMentalWellnessItem}=require('../controllers/MentallWellnessControllers')

router.get('/MUSIC',getMusicWellnessItems)
router.get('/YOGA',getYogaWellnessItems)
router.get('/BODY_SCANNING')
router.get('/SLEEP',getSleepWellnessItems)
router.get('/RELAXING_VIDEO',getRelaxingVideosItems)
router.post('/CreatePlaylist',createPlaylist)
router.get('/GetPlaylist/:name',getPlaylistByName)
router.post('/CreateItem',createMentalWellnessItem)




module.exports=router

