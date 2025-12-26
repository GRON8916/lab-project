const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;

console.log('='.repeat(60));
console.log('🚀 Запуск лабораторной работы с Docker');
console.log('='.repeat(60));

// ==================== НАСТРОЙКИ ПОДКЛЮЧЕНИЯ К ВАШЕЙ БД ====================
const dbConfig = {
    user: process.env.DB_USER || 'GRON8916',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'company_db',
    password: process.env.DB_PASSWORD || '31052004',
    port: parseInt(process.env.DB_PORT) || 5432,
};

console.log('📊 Настройки подключения к БД:');
console.log(`   Хост: ${dbConfig.host}`);
console.log(`   База: ${dbConfig.database}`);
console.log(`   Пользователь: ${dbConfig.user}`);
console.log(`   Порт: ${dbConfig.port}`);

// ==================== ПОДКЛЮЧЕНИЕ К БД ====================
let pool;
let dbConnected = false;

async function connectToDatabase() {
    try {
        pool = new Pool(dbConfig);
        
        // Тестовый запрос
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as time');
        client.release();
        
        dbConnected = true;
        console.log('✅ Успешное подключение к PostgreSQL');
        console.log(`   Время сервера БД: ${result.rows[0].time}`);
        
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error.message);
        console.log('💡 Проверьте:');
        console.log('   1. Запущена ли PostgreSQL на вашем компьютере');
        console.log('   2. Правильные ли логин/пароль в pgAdmin');
        console.log('   3. Существует ли база данных "company_db"');
        console.log('   4. Для Docker на Windows/Mac используйте host.docker.internal');
        dbConnected = false;
    }
}

// Пробуем подключиться
connectToDatabase();

// ==================== НАСТРОЙКА SERVER ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ==================== МАРШРУТЫ API ====================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 1. Информация о системе
app.get('/api/info', (req, res) => {
    res.json({
        service: 'Лабораторная работа с Docker',
        status: 'running',
        port: port,
        database: {
            connected: dbConnected,
            host: dbConfig.host,
            database: dbConfig.database,
            user: dbConfig.user
        },
        docker: process.env.NODE_ENV === 'production' ? 'Да' : 'Нет'
    });
});

// 2. Проверка сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'Сервер работает'
    });
});

// 3. Проверка подключения к БД
app.get('/api/db-test', async (req, res) => {
    if (!pool || !dbConnected) {
        return res.status(503).json({ 
            success: false,
            error: 'База данных недоступна',
            instructions: [
                '1. Убедитесь что PostgreSQL запущен',
                '2. Проверьте настройки подключения',
                '3. Для Docker используйте host.docker.internal как хост'
            ]
        });
    }
    
    try {
        const result = await pool.query(`
            SELECT 
                NOW() as current_time,
                version() as pg_version,
                current_database() as db_name,
                current_user as db_user
        `);
        
        res.json({
            success: true,
            message: 'Подключение к PostgreSQL успешно',
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            help: 'Проверьте правильность пароля и существование базы данных'
        });
    }
});

// 4. Получение списка таблиц
app.get('/api/tables', async (req, res) => {
    if (!pool || !dbConnected) {
        return res.status(503).json({ 
            success: false, 
            error: 'База данных недоступна' 
        });
    }
    
    try {
        const result = await pool.query(`
            SELECT 
                table_name,
                (SELECT count(*) FROM information_schema.columns 
                 WHERE table_name = t.table_name) as columns_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        res.json({
            success: true,
            tables: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 5. Умный запрос данных - ищет любую таблицу
app.get('/api/data', async (req, res) => {
    if (!pool || !dbConnected) {
        return res.status(503).json({ 
            success: false, 
            error: 'База данных недоступна' 
        });
    }
    
    try {
        // Сначала получим список таблиц
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
            LIMIT 1
        `);
        
        if (tablesResult.rows.length === 0) {
            return res.json({
                success: true,
                message: 'В базе данных нет таблиц',
                suggestion: 'Создайте таблицу через pgAdmin'
            });
        }
        
        const tableName = tablesResult.rows[0].table_name;
        
        // Получаем данные из первой найденной таблицы
        const dataResult = await pool.query(
            `SELECT * FROM "${tableName}" LIMIT 20`
        );
        
        res.json({
            success: true,
            table: tableName,
            data: dataResult.rows,
            count: dataResult.rowCount
        });
        
    } catch (error) {
        // Если ошибка - показываем доступные таблицы
        try {
            const tables = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            
            res.status(500).json({
                success: false,
                error: error.message,
                available_tables: tables.rows.map(t => t.table_name),
                help: 'Используйте /api/tables чтобы увидеть все таблицы'
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
});

// 6. Статистика БД
app.get('/api/stats', async (req, res) => {
    if (!pool || !dbConnected) {
        return res.status(503).json({ error: 'База данных недоступна' });
    }
    
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_tables,
                (SELECT SUM(row_count) FROM (
                    SELECT schemaname, tablename, 
                    (SELECT COUNT(*) FROM (schemaname || '.' || tablename)::regclass) as row_count
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                ) t) as total_rows,
                pg_database_size(current_database()) as db_size_bytes
        `);
        
        const dbSizeMB = (stats.rows[0].db_size_bytes / (1024 * 1024)).toFixed(2);
        
        res.json({
            success: true,
            statistics: {
                ...stats.rows[0],
                db_size_mb: dbSizeMB + ' MB'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 7. Универсальный запрос к любой таблице
app.get('/api/table/:name', async (req, res) => {
    if (!pool || !dbConnected) {
        return res.status(503).json({ error: 'База данных недоступна' });
    }
    
    const tableName = req.params.name;
    
    try {
        // Проверяем что таблица существует
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [tableName]);
        
        if (!tableExists.rows[0].exists) {
            return res.status(404).json({
                success: false,
                error: `Таблица "${tableName}" не найдена`,
                suggestion: 'Используйте /api/tables чтобы увидеть все таблицы'
            });
        }
        
        // Получаем данные
        const result = await pool.query(`SELECT * FROM "${tableName}" LIMIT 50`);
        
        res.json({
            success: true,
            table: tableName,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==================== ЗАПУСК СЕРВЕРА ====================
app.listen(port, () => {
    console.log(`\n📡 Сервер запущен: http://localhost:${port}`);
    console.log(`📊 API endpoints:`);
    console.log(`   • http://localhost:${port}/api/health - Проверка сервера`);
    console.log(`   • http://localhost:${port}/api/db-test - Проверка БД`);
    console.log(`   • http://localhost:${port}/api/tables - Список таблиц`);
    console.log(`   • http://localhost:${port}/api/data - Данные из БД`);
    console.log(`\n⚡ Приложение готово к работе!`);
    console.log('='.repeat(60) + '\n');
});