-- Создание таблицы employee
CREATE TABLE IF NOT EXISTS employee (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(10,2),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка тестовых данных
INSERT INTO employee (name, position, salary, department) VALUES
('Иван Иванов', 'Разработчик', 100000, 'IT'),
('Мария Петрова', 'Дизайнер', 80000, 'Дизайн'),
('Алексей Сидоров', 'Менеджер', 120000, 'Управление'),
('Елена Кузнецова', 'Аналитик', 90000, 'Аналитика')
ON CONFLICT DO NOTHING;

-- Создание других таблиц если нужно
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    budget DECIMAL(12,2)
);

-- Информация о таблицах
SELECT 'Таблицы созданы успешно!' as message;