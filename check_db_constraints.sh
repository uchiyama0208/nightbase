#!/bin/bash

# Supabase database connection script
# This script connects to the remote Supabase database using psql

PROJECT_REF="uxqenmpdixeqzjvolpkm"
DB_PASSWORD="$1"

if [ -z "$DB_PASSWORD" ]; then
    echo "Usage: ./connect_db.sh <database_password>"
    echo ""
    echo "Get your database password from:"
    echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
    exit 1
fi

# Connect to database
PGPASSWORD="$DB_PASSWORD" psql \
    -h "db.${PROJECT_REF}.supabase.co" \
    -p 5432 \
    -d postgres \
    -U postgres \
    -c "
-- Check for foreign key constraints to auth.users
SELECT 
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
ORDER BY tc.table_name;
"
