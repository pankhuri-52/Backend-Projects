const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const app = express();

//MiddleWare
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine','ejs');

//mongodb URL
const mongoURI='mongodb://localhost/mongouploads';

//connection
const conn = mongoose.createConnection(mongoURI);

//init gfs
let gfs;
conn.once('open',() => {
    //init stream
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('images');
})

//create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'images'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });

//@route GET /
//@desc Loads from
app.get('/', (req,res) => {
     res.render('index');
});


//@route POST /upload
//@desc uploads file to db
app.post('/upload',upload.single('file'),(req,res)=> {
    //res.json({ file : req.file });
    res.redirect('/');
});

//@route GET /file
//@desc display all files in json
app.get('/files',(req,res)=>{
     gfs.files.find().toArray((err,files) => {
          if(!files || files.length===0){
              return res.status(404).json({
                 err : 'No files exist' 
              });
          }

          return res.json(files);
     });
});

//@route GET /files/:filename
//@desc display single file
app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename : req.params.filename} , (err,file)=>{
        if(!file || file.length===0){
            return res.status(404).json({
               err : 'No file exists' 
            });
        }

        return res.json(file);
    });
});

//@route GET /image/:filename
//@desc display image
app.get('/image/:filename',(req,res)=>{
    gfs.files.findOne({filename : req.params.filename} , (err,file)=>{
        if(!file || file.length===0){
            return res.status(404).json({
               err : 'No file exists' 
            });
        }

        //check if image
        if(file.contentType === 'image/jpeg' || file.contentType === 'img/png' || file.contentType==='image/jpg'){
            //read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err : 'Not an image'
            });
        }
    });
});

const port = 5000;
app.listen(port , ()=> {
    console.log(`Server is running on port ${port}`);
});