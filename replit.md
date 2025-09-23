# Chat PD POA - Assistente Virtual do Plano Diretor de Porto Alegre

## Overview
This is a React-based chat application for Porto Alegre's urban planning regulations. It uses Supabase as the backend and implements a sophisticated RAG (Retrieval-Augmented Generation) system with multiple AI models.

## Project Structure
- **Frontend**: React + Vite + TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: shadcn/ui + Tailwind CSS
- **Authentication**: Supabase Auth
- **AI Integration**: Multiple LLM providers (OpenAI, Anthropic, Google, etc.)

## Key Configuration
- **Port**: 5000 (configured for Replit webview)
- **Vite Config**: Configured to allow all hosts (0.0.0.0)
- **Supabase**: Pre-configured with hardcoded credentials

## Current State
- ✅ Dependencies installed successfully
- ✅ Vite development server running on port 5000
- ✅ Supabase integration working
- ✅ Authentication system initialized
- ✅ RAG system active
- ✅ Deployment configuration set up

## Workflows
- **Start application**: `npm run dev` - Runs the Vite development server

## Deployment
- **Target**: Autoscale (suitable for frontend applications)
- **Build**: `npm run build`
- **Run**: `npm run preview`

## Notes
- This is a complex application with many features for urban planning regulations
- The app appears to be in Portuguese and focuses on Porto Alegre's urban planning
- Authentication is required to access most features
- The system includes admin dashboards, quality testing, and various AI-powered features