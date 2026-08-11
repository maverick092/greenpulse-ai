# GreenPulse AI

Copy and paste this entire prompt into Lovable.

MASTER PROMPT — GREENPULSE AI

Build a complete production-ready web application called GreenPulse AI.

Vision

GreenPulse AI is an AI-powered sustainability platform that enables students to report environmental issues around their campus and community.

The platform should not feel like a college project.

It should look like a real startup product capable of winning a national hackathon, attracting investors, and scaling to universities worldwide.

Core Problem

Students see sustainability issues every day:

Water leakage

Overflowing dustbins

Plastic pollution

Food wastage

Broken street lights

Energy wastage

Damaged green spaces

Poor waste segregation

Air pollution sources

Transport-related issues

Most people ignore them because reporting is difficult.

GreenPulse AI makes reporting simple using AI.

Product Concept

Student uploads:

Photo

Location

Description

AI automatically:

Identifies issue

Categorizes issue

Calculates severity

Estimates environmental impact

Generates recommended action

The platform then tracks issue progress.

Technology Stack

Use:

React

TypeScript

Tailwind CSS

Shadcn UI

Framer Motion

Supabase (Lovable managed Supabase)

PostgreSQL

Gemini API integration ready

Responsive Design

Do NOT create a separate admin panel.

Admin panel will be added later.

Focus only on student-facing experience.

Design Direction

Create a premium modern UI.

Inspiration:

Stripe

Notion

Linear

Airbnb

Headspace

Duolingo

Apple Human Interface Guidelines

Design should feel:

Modern

Friendly

Sustainable

Trustworthy

Premium

Investor-ready

Avoid:

Generic dashboard look

Outdated UI

Hacker/cyberpunk theme

Color Palette

Primary Green

#22C55E

Secondary Green

#16A34A

Light Green

#DCFCE7

Background

#F8FAFC

Dark Text

#0F172A

Accent Blue

#3B82F6

Warning

#F59E0B

Danger

#EF4444

Global UX Requirements

Use:

Glassmorphism

Soft shadows

Rounded corners

Modern cards

Smooth animations

Page transitions

Floating eco illustrations

Responsive layouts

Beautiful empty states

Loading animations

Skeleton loaders

Everything should feel premium.

Authentication

Create:

Login

Email Login

Google Login

Signup

Fields:

Full Name

College

Email

Password

Store users in Supabase Auth.

Navigation

Bottom navigation for mobile.

Sidebar for desktop.

Items:

Home

Report Issue

My Reports

Analytics

AI Assistant

Learn

Profile

Homepage

Create a stunning homepage.

Hero Section:

Headline:

Let's Build a Greener Campus Together

Subheadline:

Report sustainability issues, let AI analyze them, and create real environmental impact.

Buttons:

Report Issue

View My Reports

Illustration:

Smart green campus.

Quick Stats Cards

Show:

Total Reports

Issues Resolved

Water Saved

Carbon Impact

Animated counters.

Sustainability Score

Create:

Campus Sustainability Score

0–100 score.

Display:

Progress ring

Trend indicator

Weekly improvement

Report Issue Page

Beautiful reporting experience.

Fields:

Upload Image

Capture Image

Location

Description

Issue Categories:

Water Leakage

Waste Management

Energy Wastage

Plastic Pollution

Green Space Damage

Transport Problem

Air Pollution

Other

Modern icon cards.

AI Analysis Page

After report submission.

AI should display:

Detected Issue

Example:

Water Leakage

Confidence:

96%

Severity:

High

Environmental Impact:

High

Estimated Water Loss:

50 Litres/Day

Suggested Action:

Repair immediately.

Show beautiful AI analysis cards.

My Reports Page

Display:

Pending

In Progress

Resolved

Beautiful cards.

Filters:

Category

Severity

Date

Search functionality.

Report Details Page

Show:

Uploaded Image

Issue Details

AI Analysis

Status Timeline

Timeline:

Submitted

AI Analysis

Under Review

In Progress

Resolved

Beautiful progress tracker.

Analytics Page

Modern analytics dashboard.

Show:

Issue Categories

Pie Charts

Monthly Trends

Environmental Impact

Resolution Rates

Severity Distribution

Use modern charts.

AI Sustainability Assistant

Create ChatGPT-like interface.

Name:

GreenBot

Capabilities:

Sustainability Tips

Recycling Guidance

Waste Management Advice

Energy Saving Suggestions

Water Conservation Tips

Suggested prompts:

How can students save water?

How can we reduce plastic waste?

How can colleges become greener?

Learn Page

Create learning center.

Categories:

Water Conservation

Recycling

Renewable Energy

Climate Change

Sustainable Transport

Green Buildings

Cards with:

Thumbnail

Title

Reading Time

Gamification

Create:

Green Points

Users earn points for:

Reporting issues

Learning articles

Daily streaks

Badge System

Badges:

🌱 Green Starter

♻️ Eco Warrior

🌍 Sustainability Hero

💧 Water Saver

⚡ Energy Guardian

🏆 Campus Champion

Beautiful badge collection UI.

Profile Page

Display:

Profile Photo

Name

College

Green Points

Badges

Reports Submitted

Environmental Impact

Settings

Edit Profile

Notifications

Create notification system.

Examples:

Your report has been reviewed.

Issue resolved successfully.

New badge unlocked.

Weekly sustainability summary.

Database Design (Supabase)

Create tables:

users

reports

report_images

ai_analysis

badges

user_badges

learning_articles

notifications

sustainability_scores

activity_logs

Use proper foreign keys.

Future Ready Architecture

Design architecture so future features can be added easily:

Admin Dashboard

Real-time Issue Assignment

GIS Maps

Campus-wide Analytics

Community Voting

NGO Integration

Government Reporting

Carbon Credit System

Do NOT build these now.

Only prepare scalable architecture.

Final Goal

The final product should feel like:

"A startup-grade AI-powered sustainability platform that could genuinely be launched across colleges and universities."

The UI should be beautiful enough that judges immediately think:

"This doesn't look like a student project. It looks like a real product."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/275f549a-1b0c-4b28-a39b-44f9b2c6d5a6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
