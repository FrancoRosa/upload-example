"use strict";
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketio = require("socket.io");
const pm2 = require("pm2");
const helpers = require("./helpers");
const fileUpload = require("express-fileupload");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(`${helpers.folder}`));
app.use(fileUpload());

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const logs = [];

const saveToLogs = (payload) => {
  const { name } = payload;
  if (payload.name in logs) {
    logs[name].unshift(payload);
    if (logs[name].length > 500) logs[name].pop();
  } else {
    logs[name] = [payload];
  }
};

app.get("/", (req, res) => {
  res.send("... pm2 server working, waiting for commands\n");
});

app.post("/start", (req, res) => {
  const { path, script, name, interpreter } = req.body;
  let msg = false;
  if (script && name) {
    pm2.start(
      {
        script: `${path}/${script}`,
        name,
        interpreter,
        max_restarts: 1,
      },
      (err, apps) => {
        if (err) {
          console.log(err);
          msg = false;
        } else {
          msg = true;
        }
        res.send({ msg });
      }
    );
  } else {
    console.log("missing parameters");
    res.send({ msg });
  }
});

app.post("/stop", (req, res) => {
  const { name } = req.body;
  let msg = false;
  if (name) {
    pm2.stop(name, (err, apps) => {
      if (err) {
        console.log(err);
        msg = false;
      } else {
        msg = true;
      }
      console.log(msg);
      res.send({ msg });
    });
  } else {
    console.log("missing parameters");
    res.send({ msg });
  }
});

app.post("/restart", (req, res) => {
  const { name, path, script, interpreter } = req.body;
  let msg = false;
  if (name) {
    pm2.restart(name, (err, apps) => {
      if (err) {
        console.log(err);
        msg = false;
        if (err.message.includes("process or namespace not found")) {
          pm2.start(
            {
              script: `${path}/${script}`,
              name,
              interpreter,
              max_restarts: 1,
            },
            (err, apps) => {
              if (err) {
                console.log(err);
                msg = false;
              } else {
                msg = true;
              }
            }
          );
        }
      } else {
        msg = true;
      }
      console.log(msg);
      res.send({ msg });
    });
  } else {
    console.log("missing parameters");
    res.send({ msg });
  }
});

app.get("/recipes", (req, res) => {
  res.send(helpers.getRecipes());
});

app.get("/ls", (req, res) => {
  pm2.list((err, apps) => {
    let msg;
    if (err) {
      console.log(err);
      msg = [];
    } else {
      msg = apps.map((app) => ({ name: app.name, status: app.pm2_env.status }));
    }
    res.send({ msg });
  });
});

app.post("/logs", (req, res) => {
  const { name } = req.body;
  res.send(logs[name] || []);
});

app.post("/daemons", (req, res) => {
  helpers.setDaemons(req.body);
  res.send(true);
});

app.get("/daemons", (req, res) => {
  res.send(helpers.getDaemons());
});

// Read file and return content
app.post("/config/read", (req, res) => {
  const { path } = req.body;
  res.send(helpers.getConfig(path));
});

app.post("/config/write", (req, res) => {
  const { path, properties } = req.body;
  res.send(helpers.setConfig(path, properties));
});

app.get("/media", (req, res) => {
  res.send(helpers.getMedia());
});

app.post("/media/delete", (req, res) => {
  helpers.removeProcessFile(req.body);
  const msg = true;
  res.send({ msg });
});

app.post("/media/add", (req, res) => {
  const file = req.files.mediaFile;
  const { path } = req.body;
  helpers.createPath(`${path}/media`);
  file.mv(`${path}/media/${file.name}`, (err) => {
    if (err) return res.status(500).send(err);
    res.send("File uploaded!");
  });
});

app.post("/media/read", (req, res) => {
  const { path } = req.body;
  res.send(helpers.getProcessMedia(path));
});

app.get("/restart_host", (req, res) => {
  res.send(helpers.restartHost());
});

app.get("/shutdown_host", (req, res) => {
  res.send(helpers.shutdownHost());
});

app.get("/version/current", (req, res) => {
  res.send(helpers.getCurrentVersion());
});

app.get("/version/latest", (req, res) => {
  res.send(helpers.getLatestVersion());
});

app.get("/version/update", (req, res) => {
  helpers.updateFromRepository();
  pm2.restart("recipe_manager_backend", (err, apps) => {
    if (err) {
      console.log(err);
    } else {
      console.log("... backend restarted");
    }
  });
  pm2.restart("recipe_manager_frontend", (err, apps) => {
    if (err) {
      console.log(err);
    } else {
      console.log("... frontend restarted");
    }
  });
  res.send(true);
});

app.post("/my-recipe/copy", (req, res) => {
  const { path } = req.body;
  res.send(helpers.copyToMyRecipes(path));
});

app.post("/my-recipe/remove", (req, res) => {
  const { path } = req.body;
  res.send(helpers.removeFromMyRecipes(path));
});

app.post("/redis/send", (req, res) => {
  res.send(helpers.sendToRedis(req.body));
});

pm2.connect(() => {
  console.log(".. connecting pm2");
  pm2.launchBus((err, bus) => {
    bus.on("log:out", (packet) => {
      const {
        data,
        at,
        process: { name },
      } = packet;
      if (!name.includes("recipe_manager")) {
        console.log({ data, at, name });
        saveToLogs({ data, at, name, type: true });
        io.sockets.emit("log:out", { data, at, name });
      }
    });

    bus.on("log:err", (packet) => {
      const {
        data,
        at,
        process: { name },
      } = packet;
      if (!name.includes("recipe_manager")) {
        console.log({ data, at, name });
        saveToLogs({ data, at, name, type: false });
        io.sockets.emit("log:err", { data, at, name });
      }
    });

    bus.on("process:event", (packet) => {
      const {
        at,
        process: { name, status },
      } = packet;
      if (!name.includes("recipe_manager")) {
        console.log({ at, name, status });
        io.sockets.emit("process:event", { at, name, status });
      }
    });
    bus.on("error", console.error);
  });
});

io.on("connection", (socket) => {
  console.log("... a user connected");
  socket.emit("message", "welcome");
  socket.on("disconnect", () => {
    console.log("... user disconnected");
  });
});

// autostart cores
const recipesFromFile = helpers.getRecipes();
const recipeCores = recipesFromFile.filter((r) => r.core);

recipeCores.forEach((recipe) => {
  const { path, script, name, interpreter } = recipe;
  pm2.start(
    {
      script: `${path}/${script}`,
      name,
      interpreter,
      max_restarts: 1,
    },
    (err, apps) => {
      if (err) {
        console.log("... deleting script:", recipe.name);
      }
    }
  );
});

// autostart saved recipes
const autostartRecipes = helpers.getDaemons();
autostartRecipes.forEach((recipe) => {
  const { path, script, name, interpreter } = recipe;
  pm2.start(
    {
      script: `${path}/${script}`,
      name,
      interpreter,
      max_restarts: 1,
    },
    (err, apps) => {
      if (err) {
        console.log("... deleting script:", recipe.name);
      }
    }
  );
});

const port = 10000;
server.listen(port, () => console.log("... listening on", port));
