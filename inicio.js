#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from "./app.js";
import http from "http";

/**
 * Get port from environment and store in Express.
 */

console.log("port ", process.env.PORT || "3029");
app.listen(process.env.PORT || "3029");