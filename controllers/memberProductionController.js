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
import { ProductionLog, BiosecurityCheck } from "../models/index.js";
import { Op } from "sequelize";

export const productionLogPage = (req, res) => {
  res.render("member/production-log", {
    title: "Production Data Entry"
  });
};

export const submitProductionLog = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const { logDate, feedIntake, mortalityRate, mortalityCount, eggYield, harvestYield, notes } = req.body;
    
    await ProductionLog.create({
      memberId,
      logDate: logDate || new Date(),
      feedIntake: feedIntake ? parseFloat(feedIntake) : null,
      mortalityRate: mortalityRate ? parseFloat(mortalityRate) : null,
      mortalityCount: mortalityCount ? parseInt(mortalityCount) : null,
      eggYield: eggYield ? parseInt(eggYield) : null,
      harvestYield: harvestYield ? parseFloat(harvestYield) : null,
      notes,
      synced: true
    });
    
    req.flash("success_msg", "Production data logged successfully");
    res.redirect("/member/production");
  } catch (error) {
    req.flash("error_msg", "Error logging production data: " + error.message);
    res.redirect("/member/production");
  }
};

export const productionHistory = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const { startDate, endDate } = req.query;
    
    const where = { memberId };
    if (startDate && endDate) {
      where.logDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const logs = await ProductionLog.findAll({
      where,
      order: [['logDate', 'DESC']]
    });
    
    res.render("member/production-history", {
      title: "Production History",
      logs: logs || [],
      startDate: startDate || '',
      endDate: endDate || ''
    });
  } catch (error) {
    req.flash("error_msg", "Error loading production history: " + error.message);
    res.render("member/production-history", {
      title: "Production History",
      logs: [],
      startDate: '',
      endDate: ''
    });
  }
};

export const biosecurityCheckPage = (req, res) => {
  res.render("member/biosecurity-check", {
    title: "Biosecurity Checklist"
  });
};

export const submitBiosecurityCheck = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const { checkDate, temperature, sanitationStatus, visualHealthCheck, issues, actionsTaken } = req.body;
    
    await BiosecurityCheck.create({
      memberId,
      checkDate: checkDate || new Date(),
      temperature: temperature ? parseFloat(temperature) : null,
      sanitationStatus,
      visualHealthCheck,
      issues,
      actionsTaken,
      synced: true
    });
    
    req.flash("success_msg", "Biosecurity check submitted successfully");
    res.redirect("/member/biosecurity");
  } catch (error) {
    req.flash("error_msg", "Error submitting biosecurity check: " + error.message);
    res.redirect("/member/biosecurity");
  }
};

export const biosecurityHistory = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const checks = await BiosecurityCheck.findAll({
      where: { memberId },
      order: [['checkDate', 'DESC']],
      limit: 30
    });
    
    res.render("member/biosecurity-history", {
      title: "Biosecurity Check History",
      checks: checks || []
    });
  } catch (error) {
    req.flash("error_msg", "Error loading biosecurity history: " + error.message);
    res.render("member/biosecurity-history", {
      title: "Biosecurity Check History",
      checks: []
    });
  }
};

