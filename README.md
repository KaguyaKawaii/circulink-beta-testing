# USA-FLD CircuLink

### Modern Web-Based Library Room Reservation System

**USA-FLD CircuLink** is a full-stack web-based library room reservation system developed to modernize and simplify the process of reserving library spaces at the University of San Agustin – Florentino Dasmariñas Library (USA-FLD).

The system provides students and authorized library users with a centralized platform for viewing room availability, creating reservations, monitoring reservation status, and managing their bookings. It also provides administrative tools for managing users, rooms, reservations, notifications, reports, and other system activities.

> **Project Status:** Beta Testing

---

## Table of Contents

* [Overview](#overview)
* [Project Background](#project-background)
* [Problem](#problem)
* [Objectives](#objectives)
* [Solution](#solution)
* [Core Features](#core-features)
* [User Features](#user-features)
* [Administrator Features](#administrator-features)
* [Reservation System](#reservation-system)
* [Reservation Rules](#reservation-rules)
* [System Architecture](#system-architecture)
* [Technology Stack](#technology-stack)
* [Database](#database)
* [Application Structure](#application-structure)
* [Authentication and Authorization](#authentication-and-authorization)
* [Validation and Conflict Prevention](#validation-and-conflict-prevention)
* [Development Process](#development-process)
* [Challenges](#challenges)
* [Solutions](#solutions)
* [Testing](#testing)
* [Deployment](#deployment)
* [Future Improvements](#future-improvements)
* [What I Learned](#what-i-learned)
* [My Role](#my-role)
* [Project Status](#project-status)
* [Author](#author)

---

## Overview

Traditional room reservation processes can require users to manually check room availability, coordinate schedules, or rely on staff to manage bookings.

CircuLink was created to provide a centralized digital solution for this process.

Through the system, users can access available library rooms, select a preferred date and time, submit a reservation, and monitor the status of their request.

Administrators can manage reservations and users through dedicated administrative functionality, allowing the library to maintain better control over room scheduling and system activity.

The project focuses on three major areas:

1. **Room availability**
2. **Reservation management**
3. **Administrative control**

---

## Project Background

USA-FLD CircuLink was developed as an academic full-stack web application for the **University of San Agustin – Florentino Dasmariñas Library**.

The project was designed around the need for a more organized and accessible method of managing library room reservations.

Instead of relying entirely on manual processes, CircuLink introduces a centralized system where reservation information can be stored, validated, monitored, and managed digitally.

The project also serves as a practical implementation of full-stack web development concepts, including frontend development, backend APIs, database management, authentication, validation, deployment, and system testing.

---

## Problem

Managing shared library spaces can become difficult when multiple users want to reserve the same room or time period.

Some of the problems that CircuLink aims to address include:

* Difficulty checking room availability
* Potential scheduling conflicts
* Duplicate reservations
* Manual reservation management
* Limited visibility of reservation status
* Difficulty managing multiple rooms
* Lack of centralized reservation records
* Manual monitoring of user bookings

Without proper validation and scheduling rules, multiple users could potentially attempt to reserve the same room at overlapping times.

CircuLink addresses these problems by implementing automated availability checking and reservation validation.

---

## Objectives

The main objective of CircuLink is to develop a centralized web-based platform for managing library room reservations.

### Specific Objectives

* Provide users with an accessible reservation platform.
* Display available library rooms and schedules.
* Allow users to create and manage reservations.
* Prevent conflicting room reservations.
* Provide administrators with reservation management tools.
* Maintain centralized reservation records.
* Provide reservation status tracking.
* Improve the organization of room scheduling.
* Reduce manual reservation management.
* Provide a scalable foundation for future library services.

---

## Solution

CircuLink combines a modern frontend application, backend API, and database system into a single reservation platform.

The general process is:

```text
User
  │
  ▼
Login / Registration
  │
  ▼
Dashboard
  │
  ▼
Browse Library Rooms
  │
  ▼
Check Availability
  │
  ▼
Select Date & Time
  │
  ▼
Reservation Validation
  │
  ├── Conflict Found ──► Select Another Schedule
  │
  └── Available ───────► Submit Reservation
                              │
                              ▼
                       Reservation Status
                              │
                              ▼
                         User / Admin
```

---

# Core Features

## User Authentication

The system provides authentication functionality for users and administrators.

Users can:

* Register an account
* Log in
* Access their dashboard
* Manage their profile
* Update account information
* Access reservation features

Authentication helps ensure that reservation activities are associated with the appropriate user account.

---

## Library Room Management

CircuLink organizes available library spaces into individual rooms.

Users can view room information before making a reservation.

The reservation interface is designed to allow users to:

* Select a floor
* Select a room
* View room information
* Select a reservation date
* Select a time slot
* Check room availability
* Submit a reservation

---

## Reservation Management

Users can manage their reservations from their dashboard.

Reservation functionality includes:

* Creating reservations
* Viewing reservations
* Checking reservation status
* Viewing reservation details
* Cancelling reservations
* Reviewing reservation history

Reservations are associated with specific users, dates, times, rooms, and purposes.

---

## Reservation Status

CircuLink uses reservation statuses to represent different stages of a booking.

The system supports statuses such as:

```text
Pending
Approved
Rejected
Cancelled
Expired
Ongoing
```

This allows both users and administrators to understand the current state of a reservation.

---

# User Features

### Dashboard

The user dashboard provides an overview of the user's reservation activity.

Users can access:

* Current reservations
* Upcoming reservations
* Reservation history
* Notifications
* Account information

### Room Reservation

Users can select a room and schedule a reservation based on available dates and times.

### Reservation History

Users can review previous and current reservations through their account.

### Notifications

The system provides notifications related to reservation activity and other system events.

### Profile Management

Users can manage their account information through their profile and settings.

---

# Administrator Features

Administrators have access to management functionality for maintaining the reservation system.

### Admin Dashboard

The administrator dashboard provides an overview of system activity.

### User Management

Administrators can manage registered users and their account information.

### Reservation Management

Administrators can:

* Review reservations
* Approve reservations
* Reject reservations
* Monitor reservation activity
* Manage reservation statuses

### Room Management

Administrators can manage library room information and availability.

### Notifications

Administrators can manage system notifications and communicate important information to users.

### Reports and Logs

The system provides functionality for monitoring activities and generating useful information for administration.

---

# Reservation System

One of the main components of CircuLink is its reservation engine.

A reservation contains information such as:

```text
User
Date
Time
Location
Room
Purpose
Status
```

The system uses this information to determine whether a reservation can be created.

---

## Reservation Rules

CircuLink implements several validation rules to reduce scheduling conflicts.

### Active Reservation Check

The system checks whether a user already has an active reservation that could conflict with a new booking.

### Same-Day Reservation Check

Users are prevented from creating multiple reservations on the same day when the reservation rules do not permit it.

### Room Time Conflict Check

The system checks whether the selected room is already reserved during the requested time.

### Participant Conflict Check

The system checks for potential conflicts involving users participating in reservations.

### Weekly Reservation Limit

The system also applies reservation limits to prevent excessive bookings and provide fair access to library resources.

---

# System Architecture

CircuLink follows a full-stack architecture consisting of a frontend application, backend server, REST API, and database.

```text
┌─────────────────────────────┐
│           User              │
│       Web Browser           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Frontend           │
│            React            │
│        Tailwind CSS         │
└──────────────┬──────────────┘
               │
               │ HTTP Requests
               ▼
┌─────────────────────────────┐
│           Backend           │
│       Node.js / Express     │
│          REST API           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          Database           │
│           MongoDB           │
└─────────────────────────────┘
```

This separation allows the frontend and backend to communicate through APIs while keeping database operations on the server side.

---

# Technology Stack

| Technology       | Usage                          |
| ---------------- | ------------------------------ |
| **React**        | Frontend application           |
| **JavaScript**   | Application logic              |
| **Tailwind CSS** | UI styling                     |
| **Node.js**      | Backend runtime                |
| **Express.js**   | Backend framework              |
| **MongoDB**      | Database                       |
| **Mongoose**     | MongoDB object modeling        |
| **REST API**     | Frontend-backend communication |
| **Vercel**       | Deployment                     |
| **Git / GitHub** | Version control                |

---

# Frontend

The frontend was developed using React.

React allows the application to use reusable components and dynamically update information without requiring a complete page reload.

The frontend handles areas such as:

* User interface
* Navigation
* Dashboards
* Reservation forms
* Room selection
* Calendar functionality
* Notifications
* Reservation status
* User interactions

Tailwind CSS is used to create the application's responsive user interface.

---

# Backend

The backend is built using Node.js and Express.js.

It is responsible for:

* API endpoints
* Authentication
* Authorization
* Reservation processing
* Database operations
* Validation
* User management
* Room management
* Notifications
* Administrative operations

The backend acts as the communication layer between the React frontend and MongoDB database.

---

# Database

CircuLink uses **MongoDB** as its primary database.

The database stores information required by the application, including:

```text
Users
Reservations
Rooms
Notifications
Messages
News
Reports
Logs
```

MongoDB was selected to support the application's flexible data structure and allow the system to manage different types of records efficiently.

---

# Application Structure

The repository contains the project's main development environment under the `practice` directory. The repository also includes its Node package lock file and Git configuration files.

A simplified conceptual structure is:

```text
circulink-beta-testing/
│
├── practice/
│   │
│   ├── frontend/
│   │   └── React Application
│   │
│   └── backend/
│       └── Node.js / Express API
│
├── .gitattributes
├── .gitignore
├── package-lock.json
└── README.md
```

> The internal structure may continue to change during beta development.

---

# Authentication and Authorization

CircuLink separates functionality based on user roles.

The system distinguishes between regular users and administrators.

This allows the application to control access to different areas of the platform.

For example:

```text
Regular User
    │
    ├── Dashboard
    ├── Reservations
    ├── Notifications
    └── Profile

Administrator
    │
    ├── Admin Dashboard
    ├── Users
    ├── Reservations
    ├── Rooms
    ├── Reports
    ├── Notifications
    └── System Logs
```

Role-based access helps prevent unauthorized users from accessing administrative functionality.

---

# Validation and Conflict Prevention

Reservation validation is one of the most important parts of the system.

Before a reservation is accepted, the application evaluates several conditions.

For example:

```text
Reservation Request
        │
        ▼
Is the date valid?
        │
        ▼
Is the time valid?
        │
        ▼
Is the room available?
        │
        ▼
Does the user have a conflicting reservation?
        │
        ▼
Does the reservation violate system limits?
        │
        ▼
      Valid?
      /    \
    YES     NO
     │       │
     ▼       ▼
  Create   Reject
Reservation Request
```

This validation process helps maintain accurate scheduling information and minimizes overlapping reservations.

---

# Date and Time Handling

Scheduling systems require careful handling of dates and times.

CircuLink accounts for timezone-related issues when processing reservation schedules so that the displayed reservation time remains consistent with the application's intended timezone.

This is particularly important when frontend and backend systems handle dates differently.

Proper date and time handling helps prevent issues such as:

* Reservations appearing on the wrong date
* Incorrect reservation times
* Calendar inconsistencies
* Time comparison errors
* Backend/frontend timezone mismatches

---

# Development Process

The development of CircuLink involved multiple stages.

### 1. Planning

The reservation workflow and system requirements were identified first.

This included determining:

* User roles
* Library rooms
* Reservation requirements
* Reservation restrictions
* Administrative functions

### 2. Interface Development

The React frontend was developed around the main workflows of the application.

The interface was designed to make room selection and reservation management straightforward for users.

### 3. Backend Development

The backend API was implemented to handle application logic and communicate with the database.

### 4. Database Integration

MongoDB was integrated to store users, reservations, rooms, notifications, and other system data.

### 5. Reservation Logic

Reservation validation rules were implemented to prevent conflicts and enforce system restrictions.

### 6. Testing

The application was tested through different reservation scenarios, including valid reservations, conflicting schedules, invalid inputs, and administrative actions.

### 7. Beta Deployment

The project was deployed for beta testing so that the application could be evaluated in a more realistic environment.

The repository currently lists a Vercel deployment under its About section.

---

# Challenges

Developing a reservation system introduced several technical challenges.

## Preventing Reservation Conflicts

Multiple users may attempt to reserve the same room around the same time.

The system therefore needed reliable availability validation.

## Managing Reservation Statuses

Reservations can change states throughout their lifecycle.

Handling statuses such as pending, approved, rejected, cancelled, expired, and ongoing required careful backend and frontend coordination.

## Date and Time Issues

Calendar-based systems can encounter timezone and date conversion problems.

The application required consistent handling of reservation dates and times between the frontend and backend.

## Frontend and Backend Synchronization

Changes made by users needed to be reflected correctly in the interface after being processed by the backend.

## Database Integration

The application needed to maintain consistent relationships between users, rooms, reservations, notifications, and other records.

## Debugging

During development, different frontend, backend, API, and database issues had to be identified and resolved as the system evolved.

---

# Solutions

Several approaches were used to address these challenges.

### Centralized Reservation Validation

Reservation validation was implemented on the backend to ensure that important rules were not dependent solely on frontend behavior.

### Database-Based Availability Checking

The backend checks stored reservation data before creating new bookings.

### Structured Reservation Statuses

A defined set of reservation statuses allows the system to represent the reservation lifecycle consistently.

### Timezone-Aware Date Handling

Date and time processing was handled carefully to reduce inconsistencies between the client and server.

### Component-Based Frontend

React components were used to separate different parts of the interface and make the application easier to maintain.

---

# Testing

The beta-testing phase focuses on evaluating the system under different scenarios.

Testing includes areas such as:

### Authentication

* Valid login
* Invalid login
* Registration
* Unauthorized access
* Role-based access

### Reservations

* Creating a valid reservation
* Attempting conflicting reservations
* Cancelling reservations
* Checking reservation status
* Testing reservation limits

### Room Availability

* Available rooms
* Occupied rooms
* Conflicting schedules
* Different dates and times

### Administration

* Managing users
* Managing reservations
* Updating reservation statuses
* Managing rooms
* Reviewing system activity

### User Interface

* Navigation
* Forms
* Calendar interactions
* Responsive layouts
* Error handling

---

# Deployment

The beta application is deployed through **Vercel**.

### Live Beta

**CircuLink Beta Testing**

https://circulink-beta-testing.vercel.app/

The GitHub repository is:

https://github.com/KaguyaKawaii/circulink-beta-testing

The repository is publicly available and currently contains the project's beta development code.

---

# Future Improvements

Potential future improvements include:

* Improved reservation analytics
* More advanced reporting
* Enhanced notification functionality
* Email notifications
* Improved administrative dashboards
* Additional room management capabilities
* Better mobile optimization
* More comprehensive automated testing
* Improved accessibility
* Performance optimization
* More detailed user activity tracking

---

# What I Learned

CircuLink provided practical experience in developing a complete full-stack application rather than working only on isolated frontend components.

Through the project, I gained experience with:

* React development
* Node.js development
* Express.js
* MongoDB
* Mongoose
* REST APIs
* Authentication
* Authorization
* CRUD operations
* Database design
* Reservation logic
* Calendar systems
* Date and timezone handling
* Form validation
* Error handling
* Debugging
* Git and GitHub
* Vercel deployment
* Beta testing

More importantly, the project helped me understand how individual features need to work together as part of a complete software system.

---

# My Role

I was involved in the development of the CircuLink system, working across both frontend and backend components.

My responsibilities included:

* Designing and implementing user interfaces
* Developing React components
* Implementing reservation workflows
* Developing backend API functionality
* Integrating MongoDB
* Implementing reservation validation
* Handling date and time logic
* Debugging frontend and backend issues
* Testing system functionality
* Deploying the application
* Refining features during beta testing

The project gave me hands-on experience with the complete development lifecycle, from planning and implementation to testing and deployment.

---

# Project Highlights

### Full-Stack Application

CircuLink combines a React frontend with a Node.js/Express backend and MongoDB database.

### Real-World Use Case

The system is based on an actual library room reservation workflow rather than being only a demonstration application.

### Scheduling Logic

The project implements reservation validation and conflict prevention to handle real scheduling scenarios.

### Role-Based Functionality

Different interfaces and permissions are provided for users and administrators.

### Beta Deployment

The application is deployed online for testing and evaluation.

### Continuous Development

The repository contains a substantial development history, with GitHub currently showing **840 commits**, reflecting continued iteration throughout the project's development.

---

# Project Status

**Current Status: Beta Testing**

CircuLink is currently maintained as a beta version. Development and testing continue as features are refined and system behavior is evaluated.

The beta stage allows the application to be tested under realistic usage scenarios and provides opportunities to identify issues and improve the overall user experience.

---

# Author

**Stephen Madero Jr.**

Bachelor of Science in Information Technology

GitHub:
https://github.com/KaguyaKawaii

---

# License

This project was developed primarily for academic, educational, and portfolio purposes.

The project may contain implementation details specific to the University of San Agustin and its intended reservation workflow.
