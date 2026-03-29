/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import express from "express";
import path from "path";
import dotenv from 'dotenv';
dotenv.config();
import session from "express-session";
import flash from "connect-flash";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.use(session({
  secret: "xianfire-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Register Handlebars helpers
hbs.registerHelper('range', function(start, end, options) {
  let arr = [];
  for(let i = start; i <= end; ++i) arr.push(i);
  // If used as block helper, call options.fn for each item
  if (typeof options === 'object' && typeof options.fn === 'function') {
    let result = '';
    for (let i = start; i <= end; ++i) {
      result += options.fn(i);
    }
    return result;
  }
  // If used as simple helper, return array
  return arr;
});
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

hbs.registerHelper('formatDate', function(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
});

hbs.registerHelper('formatCurrency', function(amount) {
  if (!amount) return '₱0.00';
  return '₱' + parseFloat(amount).toFixed(2);
});

hbs.registerHelper('now', function() {
  return new Date();
});

hbs.registerHelper('multiply', function(a, b) {
  return parseFloat(a) * parseFloat(b);
});

hbs.registerHelper('lt', function(a, b) {
  const numA = typeof a === 'number' ? a : parseFloat(a) || 0;
  const numB = typeof b === 'number' ? b : parseFloat(b) || 0;
  return numA < numB;
});

hbs.registerHelper('gt', function(a, b) {
  const numA = typeof a === 'number' ? a : parseFloat(a) || 0;
  const numB = typeof b === 'number' ? b : parseFloat(b) || 0;
  return numA > numB;
});

hbs.registerHelper('add', function(a, b) {
  return (parseInt(a) || 0) + (parseInt(b) || 0);
});

hbs.registerHelper('subtract', function(a, b) {
  return (parseInt(a) || 0) - (parseInt(b) || 0);
});

hbs.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

hbs.registerHelper('isArray', function(value) {
  return Array.isArray(value);
});

hbs.registerHelper('percent', function(part, total) {
  if (!total || parseFloat(total) === 0) return 0;
  return Math.min(100, Math.round((parseFloat(part) / parseFloat(total)) * 100));
});

app.engine("xian", async (filePath, options, callback) => {
  try {
     const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, 'views');

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");
const partialsDir = path.join(__dirname, "views/partials");
fs.readdir(partialsDir, (err, files) => {
  if (err) {
    console.error("❌ Could not read partials directory:", err);
    return;
  }

   files
    .filter(file => file.endsWith('.xian'))
    .forEach(file => {
      const partialName = file.replace('.xian', ''); 
      const fullPath = path.join(partialsDir, file);

      fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
          return;
        }
        hbs.registerPartial(partialName, content);
        
      });
    });
});

// Sync all models on startup
import { syncAllModels } from "./models/index.js";
syncAllModels().then(() => {
  console.log("✅ Database ready");
}).catch(err => {
  console.error("❌ Database sync failed:", err);
});

app.use("/", router);

export default app;

if (!process.env.ELECTRON) {
  app.listen(PORT, () => console.log(`🔥 XianFire running at http://localhost:${PORT}`));
}
