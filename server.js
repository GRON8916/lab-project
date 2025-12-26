// server.js - ВТОРОЙ ВАРИАНТ (с подключением к БД)
const express = require('express');
const { Pool } = require('pg'); // Импортируем драйвер PostgreSQL
const app = express();
const port = 3000;

// ==================== НАСТРОЙКИ БАЗЫ ДАННЫХ ====================
// ⚠️ ВАЖНО: ЗАМЕНИТЕ ЭТИ НАСТРОЙКИ НА СВОИ!
const dbConfig = {
    user: 'GRON8916',           // Имя пользователя БД
    host: 'localhost',          // Хост (если БД на вашем компьютере)
    database: 'company_db',  // Имя вашей базы данных
    password: '31052004',  // Пароль от БД
    port: 5432,                 // Порт PostgreSQL (обычно 5432)
};

// ==================== ПОДКЛЮЧЕНИЕ К БД ====================
let pool;
try {
    pool = new Pool(dbConfig);
    console.log('✅ Настройки БД загружены');
    
    // Проверка подключения при запуске
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ Ошибка подключения к БД:', err.message);
            console.log('💡 Проверьте настройки dbConfig в server.js');
        } else {
            console.log('✅ Успешное подключение к PostgreSQL');
        }
    });
} catch (error) {
    console.error('❌ Ошибка создания пула подключений:', error.message);
    pool = null;
}

// ==================== НАСТРОЙКА SERVER ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Раздача статических файлов

// ==================== МАРШРУТЫ API ====================

// 1. Тест сервера (работает всегда)
app.get('/api/hello', (req, res) => {
    res.json({ 
        message: 'Сервер работает!', 
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});

// 2. Тест подключения к БД
app.get('/api/db-test', async (req, res) => {
    if (!pool) {
        return res.status(500).json({ 
            error: 'База данных не настроена',
            instructions: 'Проверьте настройки dbConfig в server.js'
        });
    }
    
    try {
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        res.json({
            success: true,
            message: 'Подключение к PostgreSQL успешно',
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            config: {
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database
            },
            tips: [
                'Проверьте что PostgreSQL запущен',
                'Проверьте имя пользователя и пароль',
                'Проверьте что база данных существует'
            ]
        });
    }
});

// 3. Получение списка таблиц в БД
app.get('/api/tables', async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'База данных не настроена' });
    }
    
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            tables: result.rows.map(row => row.table_name),
            count: result.rows.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 4. Получение данных из таблицы (пример)
app.get('/api/data', async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'База данных не настроена' });
    }
    
    try {
        // ⚠️ ВАЖНО: ЗАМЕНИТЕ 'your_table' на реальное имя вашей таблицы!
        const result = await pool.query('SELECT * FROM employee LIMIT 50');
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            hint: 'Возможно таблица "your_table" не существует. Измените запрос в server.js'
        });
    }
});

// 5. Простой CRUD пример - создание записи
app.post('/api/create', async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'База данных не настроена' });
    }
    
    const { name, value } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Поле "name" обязательно' });
    }
    
    try {
        // Создаем тестовую таблицу если её нет
        await pool.query(`
            CREATE TABLE IF NOT EXISTS test_items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Вставляем данные
        const result = await pool.query(
            'INSERT INTO test_items (name, value) VALUES ($1, $2) RETURNING *',
            [name, value || null]
        );
        
        res.json({ 
            success: true, 
            message: 'Запись создана',
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 6. Главная страница с инструкцией
app.get('/info', (req, res) => {
    res.send(`
        <html>
            <head><title>Информация о сервере</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>Лабораторная работа - Инструкция</h1>
                <h2>Доступные эндпоинты:</h2>
                <ul>
                    <li><a href="/">Главная страница</a></li>
                    <li><a href="/api/hello">Тест сервера</a></li>
                    <li><a href="/api/db-test">Тест БД</a></li>
                    <li><a href="/api/tables">Список таблиц</a></li>
                    <li><a href="/api/data">Данные из таблицы</a></li>
                </ul>
                <h2>Что нужно сделать:</h2>
                <ol>
                    <li>В файле server.js найдите секцию "НАСТРОЙКИ БАЗЫ ДАННЫХ"</li>
                    <li>Замените 'your_database', 'your_password' на реальные данные</li>
                    <li>Замените 'your_table' на имя вашей реальной таблицы</li>
                    <li>Перезапустите сервер: Ctrl+C, затем node server.js</li>
                </ol>
            </body>
        </html>
    `);
});

// ==================== ЗАПУСК СЕРВЕРА ====================
app.listen(port, () => {
    console.log(`\n🚀 Сервер запущен по адресу: http://localhost:${port}`);
    console.log(`📊 Панель управления: http://localhost:${port}/info`);
    console.log(`\n📝 Для настройки БД откройте файл server.js и обновите:`);
    console.log(`   - database: 'ваша_база_данных'`);
    console.log(`   - password: 'ваш_пароль'`);
    console.log(`   - таблицу в запросе: SELECT * FROM ваша_таблица`);
    console.log(`\n⚡ Готов к работе!\n`);
});