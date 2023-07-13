import express from "express";
import path from 'path';

const app = express()
app.set('view engine','ejs'); 

let users = [];
//using middlewares
//app.use(express.static(path.join(path.resolve() , "public")));
app.use(express.urlencoded({extended : true}));

app.get("/" , (req , res) => {
    res.render("index" , {name : "ra"})
  //  res.sendFile("index.html");
})

app.get("/users" , (req , res) => {
    res.send({
        users,
    })
})
app.post("/" , (req , res) => {
    users.push({
        "name" : req.body.name,
        "email" : req.body.email,
    })
    console.log(req.body)
})

app.listen(5000  ,() => {
    console.log("working app ");
})
