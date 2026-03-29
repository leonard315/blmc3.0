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
import { Program, Notification } from "../models/index.js";

export const programList = async (req, res) => {
  try {
    const programs = await Program.findAll({ order: [['name', 'ASC']] });
    const activeCount = programs.filter(p => p.isActive).length;
    const inactiveCount = programs.length - activeCount;

    res.render("admin/programs", {
      title: "Program Management",
      programs: programs || [],
      activeCount,
      inactiveCount
    });
  } catch (error) {
    req.flash("error_msg", "Error loading programs: " + error.message);
    res.render("admin/programs", { title: "Program Management", programs: [], activeCount: 0, inactiveCount: 0 });
  }
};

export const createProgram = async (req, res) => {
  try {
    const { name, description, type, programDate } = req.body;
    
    await Program.create({
      name,
      description,
      type,
      isActive: true,
      programDate: programDate || null
    });
    // Auto-create a notification so members can see the new program in their notifications
    try {
      await Notification.create({
        title: `New Program: ${name}`,
        content: description ? description : `A new program "${name}" has been added. Check the Programs page for details.`,
        type: 'announcement',
        targetAudience: 'members',
        priority: 'medium',
        published: true,
        publishedAt: new Date(),
        createdBy: req.session && req.session.userId ? req.session.userId : null
      });
    } catch (notifErr) {
      console.error('Failed to create program notification:', notifErr);
    }
    
    req.flash("success_msg", "Program created successfully");
    res.redirect("/admin/programs");
  } catch (error) {
    req.flash("error_msg", "Error creating program: " + error.message);
    res.redirect("/admin/programs");
  }
};

export const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, isActive, programDate } = req.body;
    
    const program = await Program.findByPk(id);
    if (!program) {
      req.flash("error_msg", "Program not found");
      return res.redirect("/admin/programs");
    }
    
    program.name = name;
    program.description = description;
    program.type = type;
    program.isActive = isActive === 'true';
    program.programDate = programDate || null;
    await program.save();
    
    req.flash("success_msg", "Program updated successfully");
    res.redirect("/admin/programs");
  } catch (error) {
    req.flash("error_msg", "Error updating program: " + error.message);
    res.redirect("/admin/programs");
  }
};

export const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    
    const program = await Program.findByPk(id);
    if (!program) {
      req.flash("error_msg", "Program not found");
      return res.redirect("/admin/programs");
    }
    
    // Soft delete by setting isActive to false instead of destroying
    program.isActive = false;
    await program.save();
    
    req.flash("success_msg", "Program deactivated successfully");
    res.redirect("/admin/programs");
  } catch (error) {
    req.flash("error_msg", "Error deleting program: " + error.message);
    res.redirect("/admin/programs");
  }
};

