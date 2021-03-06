const express = require('express')
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const Image = require("../model/Image");
const { v4: uuidv4 } = require('uuid');
const router = express.Router()
const multer = require('multer');
const fs = require('fs')

let path = require('path');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images');
    },
    filename: function(req, file, cb) {   
        cb(null, uuidv4() + '-' + Date.now() + '-'+file.originalname);
    }
});

const authValidatorFileFilter = (req, file, cb) => {
    const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if(allowedFileTypes.includes(file.mimetype)) {
        if(req.headers == null){
            cb(null, false);
            return
        }
        const auth = req.headers.authorization
        if(auth==null){
            cb(null, false);
            return
        }
        const spl = auth.split(" ")
        if(spl.length<1){
            cb(null, false);
            return
        }
        const token = spl[1]

        jwt.verify(token,"secret", (err,decoded) =>{
            if(err){
                cb(null, false);
                return
            }
            else{
                var user_id = decoded.id; 
                User.findById(user_id, function(err, user) {
                if(err){
                    cb(null, false);
                    return
                }
                if(!user){
                    cb(null, false);
                    return
                }
                });
            }
        })
        cb(null, true);
    } else {
        cb(null, false);
    }
}

let upload = multer({ storage, authValidatorFileFilter });

router.route('/uploadOne').post(upload.single('photo'), (req, res) => {
    if(req.file ==null || req.file.filename == null){
        return res.status(400).json({ error: "Missing photo file" });
    }
    const auth = req.headers.authorization
    const photo = req.file.filename;

    if(auth==null){
        return res.status(401).json({ error: "Missing Authentication Token" });
    }
    const spl = auth.split(" ")
    if(spl.length<1){
        return res.status(403).json({ error: "Bad Authentication Token" });
    }
    const token = spl[1]


    jwt.verify(token,"secret", (err,decoded) =>{
      if(err){
        return res
          .status(400)
          .json({ error: "Invalid/Expired Token"});
      }
      else{
        var user_id = decoded.id; 
        User.findById(user_id, function(err, user) {
          if(err){
            return res
            .status(400)
            .json({ error: err });
          }
          if(!user){
            return res
            .status(404)
            .json({ error: "User not found" });
          }
          else{
            const img = new Image({
                filename:photo,
                authorID:user_id
            })

            img.save()
                .then(i => res.status(200).json({ success: true, filename:photo }))
                .catch(err => res.status(400).json({ error: err }));
          }
         
        });
      }
    })
});

router.route('/uploadMultiple').post(upload.array('photos'), (req, res) => {
    if(req.files == null || req.files.length==0){
        return res.status(400).json({ error: "Missing photo files" });
    }
    const auth = req.headers.authorization
    const photos = req.files;

    if(auth==null){
        return res.status(401).json({ error: "Missing Authentication Token" });
    }
    const spl = auth.split(" ")
    if(spl.length<1){
        return res.status(403).json({ error: "Bad Authentication Token" });
    }
    const token = spl[1]

    jwt.verify(token,"secret", (err,decoded) =>{
      if(err){
        return res
          .status(400)
          .json({ error: "Invalid/Expired Token"});
      }
      else{
        var user_id = decoded.id; 
        User.findById(user_id, function(err, user) {
          if(err){
            return res
            .status(400)
            .json({ error: err });
          }
          if(!user){
            return res
            .status(404)
            .json({ error: "User not found" });
          }
          else{
            filenames = []
            photos.forEach(p => {
                filenames.push(p.filename)
                const img = new Image({
                    filename:p.filename,
                    authorID:user_id
                })
                img.save().catch(err => res.status(500).json({ error: err }));
            });
            return res.status(200).json({ success: true,filenames });           
          }
        });
      }
    })
});

router.post("/viewAll", (req, res) => {
    Image.find({}, function(err, images) {
        res.status(200).json({ success: true,images });   
        // res.send(images);  
    });
});

router.post("/delete", (req, res) => {
    const auth = req.headers.authorization
    const filenames = req.body.filenames;

    if(filenames==null || !Array.isArray(filenames)){
        return res.status(400).json({ error: "Missing Files To Delete" });
    }

    if(auth==null){
        return res.status(401).json({ error: "Missing Authentication Token" });
    }
    const spl = auth.split(" ")
    if(spl.length<1){
        return res.status(403).json({ error: "Bad Authentication Token" });
    }
    const token = spl[1]


    jwt.verify(token,"secret", (err,decoded) =>{
      if(err){
        return res
          .status(400)
          .json({ error: "Invalid/Expired Token"});
      }
      else{
        var user_id = decoded.id; 
        User.findById(user_id, function(err, user) {
          if(err){
            return res
            .status(400)
            .json({ error: err });
          }
          if(!user){
            return res
            .status(400)
            .json({ error: "User not found" });
          }
          else{
            filenames.forEach(filename => {
                Image.findOne({ filename }).then(img => {
                    if (!img) {
                        return res.status(400).json({ error: "File not found" });
                    }
                    else if(img.authorID === user_id) {
                        filepath = "./images/"+filename
                        try {
                            fs.unlinkSync(filepath)
                        } catch(err) {
                            res.status(400).json({ error: "Error Deleting" });
                        }
                        Image.deleteOne({ filename },function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.status(200).json({ success: true });
                            }
                        });
                    }
                    else{
                        res.status(403).json({ error: "User Not Authorized To Delete (Must be the author)" });
                    }
                });
            });       
          }
        });
      }
    })
});

router.post("/deleteAll", (req, res) => {
    const auth = req.headers.authorization

    if(auth==null){
        return res.status(401).json({ error: "Missing Authentication Token" });
    }
    const spl = auth.split(" ")
    if(spl.length<1){
        return res.status(403).json({ error: "Bad Authentication Token" });
    }
    const token = spl[1]


    jwt.verify(token,"secret", (err,decoded) =>{
      if(err){
        (err)
        return res
          .status(400)
          .json({ error: "Invalid/Expired Token"});
      }
      else{
        var user_id = decoded.id; 
        User.findById(user_id, function(err, user) {
          if(err){
            return res
            .status(400)
            .json({ error: err });
          }
          if(!user){
            return res
            .status(400)
            .json({ error: "User not found" });
          }
          else{
            Image.find({ authorID: user_id },function(err, images) {
                if (err) {
                    res.send(err);
                }
                else{
                    images.forEach(image => {
                        filepath = "./images/"+image.filename
                        try {
                            fs.unlinkSync(filepath)
                        } catch(err) {
                            return res.status(400).json({ error: err });
                        }
                        image.remove()
                    });
                    res.status(200).json({ success: true });
                }
            })
          }
        });
      }
    })
});

module.exports = router;