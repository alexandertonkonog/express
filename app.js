const express = require("express");
const app = express();
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
const bodyParser = require("body-parser");
const multer  = require("multer");
const fs = require("fs");

app.use(express.static('uploads'));
const upload = multer({dest:"uploads"});


app.use(cors());
app.use(bodyParser.json());
app.options('*', cors());
const urlencodedParser = bodyParser.urlencoded({extended: false});

mongoClient.connect(function(err, client){
    if(err) return console.log(err);
    dbClient = client;
    app.locals.db = client.db("socialNetwork");
    app.listen(3002, function(){
        console.log('go');
    });
});

app.get("/users", (req, res) => {
	const collection = req.app.locals.db.collection("users");
	let id = +req.query.id;
	if(id) {
		collection.findOne({id: id}, function(err, user){           
	        if(err) return console.log(err);
	        res.send(user);
	    });
	}else {
		collection.find().toArray(function(err, users){
	        if(err) return console.log(err);
	        let items= users.forEach(u => {
	        	delete u._id
	        })
	        res.send(users)
	    });
	}
	
});
app.get("/groups", (req, res) => {
	const collection = req.app.locals.db.collection("groups");
	let id = +req.query.id;
	if(id) {
		collection.findOne({id: id}, function(err, user){           
	        if(err) return console.log(err);
	        res.send(user);
	    });
	}else {
		collection.find().toArray(function(err, users){
	        if(err) return console.log(err);
	        let items= users.forEach(u => {
	        	delete u._id
	        })
	        res.send(users)
	    });
	}
	
});
app.get("/articles", (req, res) => {
	const collection = req.app.locals.db.collection("articles");
	let id = +req.query.id;
	if(id) {
		collection.findOne({id: id}, function(err, user){           
	        if(err) return console.log(err);
	        res.send(user);
	    });
	}else {
		collection.find({}).toArray(function(err, users){
	        if(err) return console.log(err);
	        res.send(users)
	    });
	}
	
});
app.post("/articles", (req, res) => {
	if(!req.body) return res.sendStatus(400);
	const collection = req.app.locals.db.collection("articles");
	let articleId = req.body.articleId;
	let myId = req.body.myId;
	let text = req.body.text;
	let date = new Date();
	req.app.locals.db.collection("users")
		.findOne({id: myId}, (err, user) => {
			collection.findOne({id: articleId}, (err, article) => {
				let comment = {
					id: article.comments.length>0 ? article.comments.length+1 : 1,
					autor: {
						id: user.id,
						img: user.avatar,
						name: user.name
					},
					text: text,
					time: date.getHours()+':'+date.getMinutes(),
					date: date.getDate()+'.'+ date.getMonth()+'.'+ date.getFullYear()
				};
				collection.updateOne({id: articleId}, {$push: {comments: comment}}, (err, result) => {
					res.send(comment)
				})
			})
		})
	
});
app.get("/actions", (req, res) => {
	const collection = req.app.locals.db.collection("actions");
	let id = +req.query.id;
	let group = req.query.group;
	if (id && group) {
		collection.find({$or: [{"group.id": id}, {$and: [{"followedUser.type": "group"}, {"followedUser.id": id}] }]})
			.toArray(function(err, users){
		        if(err) return console.log(err);
		        res.send(users)
		    });
	} else if (id) {
		collection.find({$or: [{"user.id": id}, {$and: [{"followedUser.type": "user"}, {"followedUser.id": id}] }]})
			.toArray(function(err, users){
		        if(err) return console.log(err);
		        res.send(users)
		    });
	} else {
		collection.find()
			.toArray(function(err, users){
		        if(err) return console.log(err);
		        res.send(users)
		    });
	}
	
});

app.get("/dialogs", (req, res) => {
	let name = 'dialogs'+req.query.id;
    const collection = req.app.locals.db.collection(name);
    
	collection.find().toArray(function(err, dialogs){
        if(err) return console.log(err);
        if(dialogs.length>0) {
        	let newDialogs = dialogs.map(d => ({
	        	id: d.id,
	        	user: d.secondUser,
	        	adresant: d.list[d.list.length-1].userId,
	        	lastMessage: d.list[d.list.length-1].text,
	        	time: d.list[d.list.length-1].time,
	        	date: d.list[d.list.length-1].date
	        }))
	        res.send(newDialogs);
        } else {
        	res.send('There are not dialogs');
        }			        
    });
    
});

app.get("/messages", (req, res) => {
	let myId = +req.query.myId;
	let userId = +req.query.userId;
	let nameMyDialog = 'dialogs'+req.query.myId;
	const collectionMe = req.app.locals.db.collection(nameMyDialog);
	collectionMe.find().toArray(function(err, dialogs)	{
		if(err) return console.log(err);
		if(dialogs.some(d => d.secondUser.id === userId)){
			let item = dialogs.find(d => d.secondUser.id === userId);
			res.send(item);
		} else {
			req.app.locals.db.collection('users').find().toArray(function(err, users){
				let date = new Date();
				let meItem = users.find(u => u.id === myId);
				let userItem = users.find(u => u.id === userId);
				let newDialogMe = {
					id: userId,
					firstUser: {
						id: meItem.id,
						name: meItem.name,
						img: meItem.avatar
					},
					secondUser: {
						id: userItem.id,
						name: userItem.name,
						img: userItem.avatar
					},
					creationTime: date.getHours()+':'+date.getMinutes(),
					creationDate: date.getDate()+'.'+ date.getMonth()+'.'+ date.getFullYear(),
					list: []
				};
				res.send(newDialogMe);
			})
		}
	})
});

app.post("/messages", (req, res) => {
	if(!req.body) return res.sendStatus(400);
	let myId = +req.body.id;
	let userId = +req.body.userId;
	let text = req.body.text;
	let db = req.app.locals.db;
	
	let addMessage = (myId, userId, text) => {
		let name = 'dialogs'+myId;
		const collection = req.app.locals.db.collection(name);
		collection.findOne({id: userId}, (err, dialog) => {
			let date = new Date();
			let newMessage = {
				id: dialog && dialog.list.length > 0 ? dialog.list.length + 1 : 1,
				userId: +req.body.id,
				text: text,
				time: date.getHours()+':'+date.getMinutes(),
				date: date.getDate()+'.'+date.getMonth()+'.'+date.getFullYear(),
				isRead: false
			}
			collection.updateOne({id: userId}, {$push: {list: newMessage}}, (err, result) => {
				if(dialog.firstUser.id === +req.body.id) res.send(newMessage);
			})
		})
		
	};

	let createDialog = (myId, userId, text) => {
		let name = 'dialogs'+myId;
		const collection = req.app.locals.db.collection(name);
		req.app.locals.db.collection('users').find().toArray(function(err, users){
			let date = new Date();
			let meItem = users.find(u => u.id === myId);
			let userItem = users.find(u => u.id === userId);
			let newDialogMe = {
				id: userId,
				firstUser: {
					id: meItem.id,
					name: meItem.name,
					img: meItem.avatar
				},
				secondUser: {
					id: userItem.id,
					name: userItem.name,
					img: userItem.avatar
				},
				creationTime: date.getHours()+':'+date.getMinutes(),
				creationDate: date.getDate()+'.'+ date.getMonth()+'.'+ date.getFullYear(),
				list: []
			};
			collection.insertOne(newDialogMe, (err, result) => {
				addMessage(myId, userId, text);
			});
		})
	}
	let checkDialog = (myId, userId, text) => { //неправильно проверяет
		let name = 'dialogs'+myId;
		const collection = req.app.locals.db.collection(name);
		collection.findOne({id: userId}, (err, dialog) => {
			if (dialog) {
				addMessage(myId, userId, text);
			} else {
				createDialog(myId, userId, text);
			}
		})
	};
	
	checkDialog(myId, userId, text);
	checkDialog(userId, myId, text);
})


app.post("/signup", (req, res) => {
	if(!req.body) return res.sendStatus(400);
	const db = req.app.locals.db;
	const collection = req.app.locals.db.collection("login");
	const userCollection = req.app.locals.db.collection("users");
	collection.find().toArray(function(err, profile) {
		if (profile.some(p => p.login === req.body.login)) {
			res.send({
				success : false,
                error : 'This login already exist',
			})
		}else {
			let userLogin = {
				id: profile.length+1,
				login: req.body.login,
				password: req.body.password
			}
			collection.insertOne(userLogin, (err, result) => {
				db.createCollection('dialogs'+userLogin.id, (err, result) => {
					userCollection.find().toArray(function(err, users){
						let img = req.body.link ? req.body.link : 'https://www.lifesciencetraininginstitute.com/wp-content/uploads/2017/08/instructor_man-placeholder.png';
						let date = new Date();
						let userUsers = {
							id: userLogin.id,
							avatar: img,
							name: req.body.name,
							friends: [],
							active: date.getDate()+'.0'+date.getMonth()+'.'+date.getFullYear()+' '+date.getHours()+':'+date.getMinutes(),
							tag: ['Newest'],
							type: 'user',
							follow: [],
							data: {
								birthday: null,
								city: null,
								sex: null,
								education: [],
								family: [],
								language: []
							}
						}
						userCollection.insertOne(userUsers, (err, result) => {
							res.send({
								success : true,
			                	data : userUsers,
			                	key: req.body.password
							})
						});
						
					})
				});
			});
			
			
		}
	})
});
app.post("/login", (req, res) => {
	if(!req.body) return res.sendStatus(400);
	const collection = req.app.locals.db.collection("login");
	collection.find().toArray(function(err, profile) {
		if (profile.some(p => p.login === req.body.login)) {
			let item = profile.find(p => p.login === req.body.login);
			if (item.password === req.body.password) {
				req.app.locals.db.collection("users").findOne({id: item.id}, (err, user)=> {
					res.send({
						success : true,
	                	data : user,
	                	key : req.body.password
					})
				})
			} else {
				res.send({
					success : false,
                	error : 'Wrong login or password'
				})
			}
		} else {
			res.send({
				success : false,
            	error : 'Wrong login or password'
			})
		}
	})
})
app.get("/logout", (req, res) => {
	res.send({
		success : true,
	})
})
app.post("/setting", upload.single("file"), (req, res, next) => {
	if(!req.body) return res.sendStatus(400);
	const collection = req.app.locals.db.collection("users");
	if(req.body.type === 'setting') {
		collection.updateOne({id: req.body.id}, {$set: {data: req.body.data, name: req.body.name}}, (err, result) => {
			collection.findOne({id: req.body.id}, (err, user) => {
				res.send(user);
			})
		})
	} else if (req.body.type === 'img') {
		let beforeName = __dirname+'/uploads/'+req.file.filename;
		let afterName = __dirname+'/uploads/'+req.file.originalname;
		fs.rename(beforeName, afterName, (err) => {
			if (err) {
				return console.error(err)
			}
			let myHttp = 'http://127.0.0.1:3002/';
			collection.updateOne({id: +req.body.id}, {$set: {avatar: myHttp+req.file.originalname}}, (err, result) => {
				collection.findOne({id: +req.body.id}, (err, user) => {
					res.send({
						success : true,
	                	data : user
					});
				})
			})
		})
	}
})
app.post("/article/create", upload.single("file"), (req, res, next) => {
	if(!req.body) return res.sendStatus(400);
	const collection = req.app.locals.db.collection("articles");
	const userCollection = req.app.locals.db.collection("users");
	let date = new Date();
	if(req.body.type === 'article') {
		let beforeName = __dirname+'/uploads/'+req.file.filename;
		let afterName = __dirname+'/uploads/'+req.file.originalname;
		fs.rename(beforeName, afterName, (err) => {
			if (err) {
				return console.error(err)
			}
			let myHttp = 'http://127.0.0.1:3002/';
			userCollection.findOne({id: +req.body.id}, (err, user) => {
				collection.find().toArray((err, articles) => {
					let article = {
						id: articles.length>0 ? articles.length+1 : 1,
						name: req.body.name,
						autor: {
							id: user.id,
							name: user.name,
							img: user.avatar
						},
						tag: req.body.tags && req.body.tags.length>0 ? req.body.tags : [],
						img: myHttp+req.file.originalname,
						text: req.body.text,
						type: req.body.type,
						comments: [],
						date: date.getDate()+'.0'+date.getMonth()+'.'+date.getFullYear()+' '+date.getHours()+':'+date.getMinutes(),
					}
					collection.insertOne(article, (err, result) => {
						res.send({
							success : true,
	                		data : article
						})
					})
				})	
			})
		})
		
		// collection.updateOne({id: req.body.id}, {$set: {data: req.body.data, name: req.body.name}}, (err, result) => {
		// 	collection.findOne({id: req.body.id}, (err, user) => {
		// 		res.send(user);
		// 	})
		// })
	} 
})
app.get("/user/follow", (req, res) => {
	let id = +req.query.id;
	let userId = +req.query.userId;
	let remove = req.query.remove;
	const collection = req.app.locals.db.collection("users");
	if(remove) {
		collection.findOne({id: id}, (err, user) => {
			let newArr = user.friends.filter(item => item !== userId);
			collection.updateOne({id: id}, {$set: {friends: newArr}}, (err, result) => {
				res.send({
					success : true,
					arr : newArr
				})
			})
		})
	} else {
		collection.updateOne({id: id}, {$push: {friends: userId}}, (err, result) => {
			res.send({
				success : true,
				id : userId
			})
		})
	}
})
app.get("/group/follow", (req, res) => {
	let id = +req.query.id;
	let userId = +req.query.userId;
	let remove = req.query.remove;
	const collection = req.app.locals.db.collection("users");
	const collectionG = req.app.locals.db.collection("groups");
	if(remove) {
		collection.findOne({id: id}, (err, user) => {
			let newArr = user.follow.filter(item => item !== userId);
			collection.updateOne({id: id}, {$set: {follow: newArr}}, (err, result) => {
				collectionG.findOne({id: userId}, (err, group) => {
					let newArrGroup = group.friends.filter(item => item !== id);
					collectionG.updateOne({id: userId}, {$set: {friends: newArrGroup}}, (err, result) => {
						res.send({
							success: true,
							arr: newArr
						})
					})
				})
			})
		})
	} else {
		collection.updateOne({id: id}, {$push: {follow: userId}}, (err, result) => {
			collectionG.updateOne({id: userId}, {$push: {friends: id}}, (err, result) => {
				res.send({
					success : true,
					id : userId
				})
			})
		})
	}
	
})
app.post("/auth", (req, res) => {
	if(!req.body) return res.sendStatus(400);
	const collection = req.app.locals.db.collection("users");
	req.app.locals.db.collection("login").find().toArray((err, logins)=> {
		if (logins.some(u => u.password === req.body.key)) {
			let login = logins.find(u => u.password === req.body.key);
			collection.findOne({id: login.id}, (err, user) => {
				res.send({
					success : true,
		        	data : user
				})
			})
		} else {
			res.send({
				success : false,
	        	error : 'wrong key'
			})
		}
		
	})
})
process.on("SIGINT", () => {
    dbClient.close();
    process.exit();
});