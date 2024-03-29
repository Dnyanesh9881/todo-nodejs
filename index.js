require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const userModel = require("./models/userModel");
const bcrypt = require("bcryptjs");
const { userDataValidation, isEmailRgex, generateToken, sendVerificationEmail } = require("./utils/authUtils");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const isAuth = require("./middlewares/isAuthMiddleware");
const todoModel = require("./models/todoModel");
const todoDataValidation = require("./utils/todoUtils");
const sessionModel = require("./models/sessionModel");

const jwt=require("jsonwebtoken");


// constants
const app = express();
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT;
const store = new mongoDbSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

//middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store,
  })
);
app.use(express.static("public"));
// connect DataBase
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("connected dataBase");
  })
  .catch((err) => {
    console.log(err);
  });

//API's
app.get("/", (req, res) => {
  return res.send("Todo server is working");
});

app.get("/login", (req, res) => {
  return res.render("loginPage");
});

app.post("/login", async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password)
    return res.status(400).json("All fields are required");

  try {
    let userDb;
    if (isEmailRgex({ email: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }

    if (!userDb) return res.status(400).json("User Not Found");

    if(!userDb.isEmailVerified){
      res.status(400).json("Verify Your Email First");
    }
    //passwod match
    const passwodMatch = await bcrypt.compare(password, userDb.password);
    if (!passwodMatch) return res.status(400).json("Password does not match");

    req.session.isAuth = true; // storing the session in dataBase
    req.session.user = {
      userId: userDb._id,
      username: userDb.username,
      email: userDb.email,
    };
    // console.log(req.session);

    return res.redirect("/dashboard");
  } catch (error) {
    // console.log(error);
    return res.send({
      status: 500,
      message: "Internal server Error",
      error: error,
    });
  }
});

app.get("/register", (req, res) => {
  return res.render("registerPage");
});

app.post("/register", async (req, res) => {
  //   console.log(req.body);
  const { name, email, username, password } = req.body;

  try {
    await userDataValidation({ name, email, username, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  const isEmailExist = await userModel.findOne({ email: email });
  if (isEmailExist) {
    return res.send({
      status: 400,
      message: "Email already exist",
    });
  }

  const isUsernameExist = await userModel.findOne({ username: username });
  if (isUsernameExist) {
    return res.send({
      status: 400,
      message: "Username already exist",
    });
  }
  const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALT));

  const userObj = new userModel({
    name,
    email,
    username,
    password: hashPassword,
  });
  console.log(userObj);

  try {
    const userdb = await userObj.save();

    const verifiedToken=generateToken(email);
    console.log(verifiedToken);

    sendVerificationEmail(email, verifiedToken);
    
    return res.redirect("/login");
  } catch (error) {
    return res.send({
      status: 500,
      message: "internal server error",
      error: error,
    });
  }
});

app.get("/verifytoken/:token", async(req, res)=>{
  const token =req.params.token;

  const userEmail=jwt.verify(token, process.env.SECRET_KEY);
  
  try {
    const userDb=await userModel.findOneAndUpdate({email:userEmail}, {isEmailVerified : true});
    console.log(userDb);
    return res.redirect("/login");
  } catch (error) {
    return res.send({
      status:500,
      message:"Internal server error",
      error:error
    })
  }
})

app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboardPage.ejs");
});
app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.send({
        status: 500,
        message: "Internal server Error",
        error: err,
      });
      return res.redirect("/login");
  });
  
});

app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  const username = req.session.user.username;

  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    console.log(deleteDb);
    return res.redirect("/login");
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.post("/create-item", async (req, res) => {
  console.log(req.body);
  const username = req.session.user.username;
  const { todo } = req.body;

  try {
     await todoDataValidation({todo:todo})
  } catch (error) {
     return res.send({
        status:400,
        message:error
     })
  }

  const todoObj = new todoModel({
    todo,
    username,
  });
  // console.log(todoObj);
  try {
    let todoDb = await todoObj.save();
    console.log(todoDb);
    return res.send({
      status: 201,
      message:"Todo created successfully",
      data:todoDb
    })
  } catch (error) {
    return res.status(500).json("Internal server error");
  }
});

app.get("/read-item", async (req, res) => {
  const username = req.session.user.username;
  let SKIP=Number(req.query.skip) || 0;
  let LIMIT=3;

  try {
    const todoDb = await todoModel.aggregate([
      {$match:{username:username}},
      {
        $facet:{
          data:[{$skip:SKIP}, {$limit:LIMIT}]
        }
      }
    ])
    // console.log(todoDb[0].data);
    if (todoDb[0].data.length === 0) {
      return res.send({
        status: 400,
        message: "No Todo Found",
      });
    }
    return res.send({
      status: 200,
      message: "Read Success",
      data: todoDb[0].data,
    });
  } catch (error) {
    return res.send({
      status: 500,
      Message: "Internal Server Error",
      error: error,
    });
  }
});

app.post("/edit-item", async (req, res) => {
  const username = req.session.user.username;
  const { todoId, todoText } = req.body;

  try {
    await todoDataValidation({todo: todoText});
 } catch (error) {
    return res.send({
       status:400,
       message:error
    })
 }

  try {
    const todoDb = await todoModel.findOne({ _id: todoId });

    console.log(todoDb);
    if (username !== todoDb.username) {
      return res.status(403).json("Authorisation failed");
    }
    const updatedTodoDb = await todoModel.updateOne(
      { _id: todoId },
      { $set: { todo: todoText } }
    );
    console.log(updatedTodoDb);
    return res.send({
     status:200,
     message:"updated Successfully"
    })
  } catch (error) {
    return res.status(500).json("Internal Server Error");
  }
});

app.post("/delete-item", async(req, res)=>{

  const{deleteId}=req.body;
  const username=req.session.user.username;
  if (!deleteId) {
    return res.send({
      status: 400,
      message: "Missing todoId",
    });
  }

  try {
     const todoDb=await todoModel.findOne({_id:deleteId});
     console.log(todoDb);
     if (!todoDb)
     return res.send({
       status: 400,
       message: "No todo found",
     });

   console.log(todoDb);


     if(username!==todoDb.username){
      return res.status(403).json("Authorisation failed");
     }

     const deleteTodo=await todoModel.deleteOne({_id:deleteId});
     console.log(deleteTodo);
     return res.send({
         status:200,
         message:"Todo Deleted Successfully",
         data:todoDb
     })
  } catch (error) {
     res.send({
      status:500,
      message:"Internal server error",
      error:error
     })
  }
})

app.listen(PORT, () => {
  console.log(`server is running on PORT ${PORT}`);
});

 