const studentInfo = require('../model/studentInfoModel');
const asyncHandler = require('express-async-handler')

const getInfo = asyncHandler(async(req, res) => {
  const info = await studentInfo.find().sort({ createdAt: -1 })
  res.status(200).json(info)
})

const createInfo = asyncHandler(async (req, res) => {
  console.log("the request body is", req.body)
  const {name, email, batch, dept, CID, boardType} = req.body
  if(!name || !email || !batch || !dept || !CID){
    res.status(400)
    throw new Error("All fields are mandatory")
  }
  
  // Use boardType from request or default to 'Other'
  // Also normalize dept field case for better consistency in analytics
  const studentData = {
    name, 
    email, 
    batch,
    dept, 
    CID,
    boardType: boardType || 'Other'
  }
  
  const info = await studentInfo.create(studentData)

  res.status(200).json(info)
})

module.exports = {createInfo, getInfo}


