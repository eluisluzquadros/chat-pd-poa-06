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
- ✅ **TRANSFORMED TO EXTERNAL AGENT HUB** 
- ✅ External Agent Gateway implemented (Dify, Langflow, CrewAI)
- ✅ All persistence maintained in Supabase (conversations, users, auth, tests)
- ✅ Admin Playground for isolated agent testing
- ✅ Settings Advanced Configuration with default agent selection
- ✅ Quality/Benchmark modules integrated with external agents
- ✅ Legacy edge functions cleanup completed
- ✅ Vite development server running on port 5000
- ✅ Authentication system functional
- ✅ Deployment configuration set up

## Workflows
- **Start application**: `npm run dev` - Runs the Vite development server

## Deployment
- **Target**: Autoscale (suitable for frontend applications)
- **Build**: `npm run build`
- **Run**: `npm run preview`

## Architecture Notes
- **MAJOR TRANSFORMATION COMPLETED**: Platform now serves as frontend hub for external agents
- **Data Persistence**: ALL data (conversations, users, auth, test histories, configurations) remains in Supabase
- **AI Processing**: Moved from internal edge functions to external agents (Dify, Langflow, CrewAI)
- **Admin Features**: Isolated playground for agent testing, advanced configuration settings
- **Quality/Benchmark**: Integrated with external agents while maintaining Supabase persistence
- Application in Portuguese focusing on Porto Alegre's urban planning regulations
- Authentication required for full feature access
- Robust fallback system maintains functionality when external agents unavailable