// server.js - ПЕРВЫЙ ВАРИАНТ (самый простой)
const express = require('express');
const app = express();
const port = 3000;

// Настройка сервера
app.use(express.static('public')); // Раздача HTML/CSS файлов

// Простой маршрут для проверки
app.get('/', (req, res) => {
    res.send('Сервер работает! Перейдите на /index.html');
});

// Еще один маршрут
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Привет от сервера!', time: new Date() });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`✅ Сервер запущен: http://localhost:${port}`);
    console.log(`📁 Статические файлы: http://localhost:${port}/index.html`);
});