var express = require('express');
var router = express.Router();
const multer = require("multer");
const fs = require('fs');
const nodemailer = require('nodemailer');

//Backend routes (endpoints)

//const host = "http://3.225.12.137:3001"
const host = "http://localhost:3001"

// Get the date
function getDate()
{
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();

  return mm + '/' + dd + '/' + yyyy;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//Addition endpoint
router.get('/add/:firstNumber/and/:secondNumber', (req,res)=>{

  let firstNo = parseInt(req.params.firstNumber),
      secondNo = parseInt(req.params.secondNumber);
  res.json({"addition" : firstNo + secondNo});
});


var mongoose = require('mongoose');
const uri = 'mongodb+srv://peterbuo:m3x93WLJhWFagQP@inventorysite.lbmkkjb.mongodb.net/?retryWrites=true&w=majority' //atlas
//const uri = 'mongodb://mongo:27017' //local (docker service)

async function connect(){
  try {
    await mongoose.connect(uri)
    console.log("Connected to mongoDB")
    

  }
  catch(error){
    console.log(error)
  }
}


connect();

// Set up DB!

// My schema can also have methods if i want.... such as displayDetails.
const itemSchema = new mongoose.Schema({
  name: String,
  qty: Number,
  img: String,
  details: String,
  op: String,
  editor: String,
  postdate: String,
  editdate: String,
});
// Compile schema to a Model (create "Item")
const Item = mongoose.model('Item', itemSchema);

// User schema for DB
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  admin: Boolean
});
// Compile schema to a Model
const User = mongoose.model('User', userSchema);

//Schema for project
const projectSchema = new mongoose.Schema({
  title: String,
  date: String,
  description: String,
  html: String,
  icon: String,
  posts: Array // Array of object ID's 
});
// Compile schema to a Model (create "Item")
const Project = mongoose.model('Project', projectSchema);

//Schema for post
const postSchema = new mongoose.Schema({
  title: String,
  date: String,
  text: String,
});
// Compile schema to a Model (create "Item")
const Post = mongoose.model('Post', postSchema);



//API endpoints


// Image reception handling
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.split("/")[1] === "png" || file.mimetype.split("/")[1] === "jpg" || file.mimetype.split("/")[1] === "jpeg") {
    cb(null, true);
  } else {
    cb(new Error("Please upload an image"), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// NODE MAILER
// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'peters.resume.mailer@gmail.com',
    pass: 'zqpujsblosgfxnrl',
  },
});

// Route to handle email sending
router.post('/send-email', (req, res) => {
  const { name, email, message } = req.body;

  // Email message options
  const mailOptions = {
    from: 'peters.resume.mailer@gmail.com',
    to: 'pete.buo@gmail.com',
    subject: 'New Message from Contact Form',
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send the email' });
    } else {
      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Email sent successfully' });
    }
  });
});

router.post('/login', login);

function login(req, res)
{
  User.find({'username': req.body.username, 'password': req.body.password})
  .then(function(value) {
    if (value.length === 1)
    {
      res.json({'authenticated': true, 'username': value[0].username, 'admin': value[0].admin})
    }
    else
    {
    res.json({'authenticated': false})
  }
    
    
  }) 
  
}

router.post('/signup', signup);

function signup(req, res)
{

  const newUser = new User({'username': req.body.username, 'password': req.body.password, 'admin': false})
    newUser.save().then(function(value) 
    {
      // THIS IS THE RESPONSE THE CLIENT WILL GET!
      res.json({username: value.username}) 
    })
}

router.post('/update-account', updateAccount);

// Update this account username and password
function updateAccount(req, res)
{
  User.findOneAndUpdate({'username': req.body.oldUsername}, {'username': req.body.username, 'password': req.body.password})
    .then(function(value) 
    {
      // THIS IS THE RESPONSE THE CLIENT WILL GET!
      res.json({ id: value?._id}) 
    })
}



// given username get password
router.post('/get-password', getPassword)
function getPassword(req, res)
{
  User.findOne({'username': req.body.username})
  .then(function(value) {
    res.json({'password': value?.password})
  })
}


// given username get id
router.post('/get-id', getId)
function getId(req, res)
{
  User.findOne({'username': req.body.username})
  .then(function(value) {
    res.json({'id': value?._id})
  })
}

// given id get name
router.post('/get-name', getName)
async function getName(req, res)
{
  await User.findById(req.body.id)
  .then(function(value) {
    res.json({'username': value?.username})
  })
  .catch((result) => {
    // No id provided, usually when a user is logged out!
    res.json({'username': "ANONYMOUS"})
  })
}

router.post('/getUser', getUser)
function getUser(req, res)
{
  User.find({'username': req.body.username})
  .then(function(value) {
    let exists = (value.length === 1)
    res.json({'exists': exists})
  }) 
}

// Endpoint to add a new project to the server.
router.post('/addProject', upload.array("image"), addProject);
function addProject(req, res)
{
  let date = getDate()

  let title = req.body.title;
  let description = req.body.description
  let icon = (req.files.length > 0) ? host+"/images/"+req.files[0].filename: ""
  let html = req.body.html


  const proj = new Project({
    title: title,
    date: date,
    description: description,
    html: html,
    icon: icon
  })
  proj.save();

  res.json('The project has been added!')


}


// Edit project
router.post('/editProject', upload.array("image"), editProject);
async function editProject(req, res)
{

  let title = req.body.title;
  let description = req.body.description
  let icon = (req.files.length > 0) ? host+"/images/"+req.files[0].filename: ""
  let html = req.body.html
  let id = req.body.id


  const proj = await Project.findOne({_id: id});

  let old_icon = proj.icon

  proj.html = html
  proj.title = title
  proj.icon = icon? icon: old_icon
  proj.description = description
  proj.save();

  // Delete old icon, if there is a new icon!
  if (icon)
  {
    deleteByURL(old_icon)
  }


  res.json('The project has been updated!')
}

// Endpoint to add a new post to the server.
// Requires the project id.
router.post('/addPost', addPost);
function addPost(req, res)
{
  let date = getDate()

  let title = req.body.title;
  let text = req.body.text
  let project_id = req.body.project_id

  const post = new Post({
    title: title,
    date: date,
    text: text,
  })
  post.save()
  .then(savedDocument => {
    const objectId = savedDocument._id;
    // Handle the ObjectId: Add to the project posts array, this id!
    Project.findByIdAndUpdate(project_id, { $push: { posts: objectId } },
      { new: true })
      .then(updatedDocument => {
        
        // Post added, we can return
        res.json('Post added!')
      })
      .catch(error => {
        console.error('Error adding post:', error);
      });

      // Do we need to handle the returned promise? Only if I want to refresh when done. 
  })
  .catch(error => {
    console.error('Error saving new post:', error);
    // Handle the error
  });

}

router.post('/editPost', editPost);
async function editPost(req, res)
{

  let title = req.body.title;
  let text = req.body.text
  let post_id = req.body.id

  const foundPost= await Post.findOne({_id: post_id});
  foundPost.title = title
  foundPost.text = text

  foundPost.save()

}

//endpoint to add an item to the DB!!!!!
// server recieved client request.
router.post('/addItem', upload.array("image"), add);

function add(req, res)
{
  let name = req.body.name;
  let qty = req.body.qty;
  let details = req.body.details
  let op = req.body.op
  let editor = req.body.editor
  let date = req.body.date
  let id = req.body.id; //if 'none' we are adding
  let img = (req.files.length > 0) ? host+"/images/"+req.files[0].filename: ""
  // the img file, if any, is passed through the FormData object where we can read .files through multer middleware
  

  // doesnt exist so add it
  if (id == "none")
  {
    const newItem = new Item({"name": name, "qty": qty, "img": img, "details": details, "op": op, "postdate": date})
    newItem.save().then(function(value) {
    // THIS IS THE RESPONSE THE CLIENT WILL GET! return the id to them so we can reference this new item without reloading
    res.json({"name": name, "qty": qty, "img": img, "details": details, id: value._id}) 
})
  .catch(function(error) {
    console.log("ADDING ITEM FAILED: ", error)
  })
  }

  else // it exists so find the id and update the database!
  {
    if (req.files.length === 0) // we are not changing the image
    { // Only update if something has changed
      // If this exact item exists it was not updated
      Item.findOne({"_id": id, "name": name, "qty": qty, "details": details})
      .then(function(value) {
        if (value)
        {
          res.json({'response': "nothing to change!"})
          // we are done here, abort change because nothing changes
        }
        else
        {
          // We didnt find an exact match which means we must update something!
          Item.findByIdAndUpdate(id, {"name": name, "qty": qty, "details": details, "editor": editor, "editdate": date})
        .then(function(value) {
          res.json({"name": name, "qty": qty, "details": details, id: value._id}) 
        }) 
        .catch((res) => {
          console.log("catch")
        })


        }
      }) 
      .catch((res) => {
        console.log("catch")
      })

    }
    else // we are updating the image! delete the previous one.
    {
      deleteByURL(req.body.prevImg)

      Item.findByIdAndUpdate(id, {"name": name, "qty": qty, "img": img, "details": details, "editor": editor})
        .then(function(value) {
          res.json({"name": name, "qty": qty, "img": img, "id": value._id, "details": details})
        })
    }
    
    
  }
}



// get all items
router.get('/getAllItems', (req,res) => {
  
  // return result query, should i parse it here?
  findAll(res)
  

})

// delete one item
// delete the currentImage as well
router.get('/delete/:id', (req, res) => {

  // Find the image by this id 
  Item.findById(req.params.id)
  .then(function(value) {
    // delete this image if we got a response
    if (value)
      deleteByURL(value.img)
    
  })
  
  Item.deleteOne({_id: req.params.id})
  .then(
    res.json({result: "success"})
  )
})

// Delete the given image by web path
function deleteByURL(url)
{
  // do not allow if url is blank because were trying to delete the entire image folder!!
  if (url == "")
    return;


  // finds the image given by the url on the local machine (server) and tries to delete it
  fs.unlink(process.cwd() + "/public" +url.substring( url.indexOf("/images/")), (err) => {
    if (err) {
        console.log(err) // we couldnt delete the image from the server, but we should continue to delete item from DB.
    }
    // We successfully deleted the old file.
});
}


async function findAll(myres)
{

  Item.find({})
  .then(
    res => found(res, myres),
    err => console.error(`Something went wrong: ${err}`),
  );
    
}

// found the items
function found(res, myres)
  {
    myres.json(res)
  }


// Get all posts for the given project
router.get('/getPosts/:project_id', (req, res) => {
  const id = req.params.project_id;

  Project.findById(id)
    .then((result) => {
      const postPromises = result.posts.map((postId) =>
        Post.findById(postId)
          .then((postResult) => ({
            title: postResult.title,
            id: postResult._id,
            date: postResult.date,
            text: postResult.text,
          }))
          .catch((error) => {
            console.error('Error finding post:', error);
            
          })
      );

      Promise.all(postPromises)
        .then((posts) => {
          res.json(posts);
        })
        .catch((error) => {
          console.error('Error retrieving posts:', error);
          res.status(500).json({ error: 'Internal server error' });
        });
    })
    .catch((error) => {
      console.error('Error finding project:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
});


// get all projects
router.get('/getProjects', (req,res) => {
  
  // return result query, should i parse it here?
  findAllProjects(res)
  

})

async function findAllProjects(myres)
{

  Project.find({})
  .then(
    res => foundProject(res, myres),
    err => console.error(`Something went wrong: ${err}`),
  );
    
}

// found the items
function foundProject(res, myres)
  {
    myres.json(res)
  }



module.exports = router;
