# BOSS直聘智能岗位投递系统 - PostgreSQL 数据库设计

基于微服务架构与需求文档，以下是系统的 PostgreSQL 表结构设计 (DDL)。

## 设计原则
1. **多租户隔离**：除系统公共数据（如全局岗位池 `job_pool`、系统管理员表）外，所有业务表均带有 `customer_id` 字段，确保应用层能在查询时通过 `WHERE customer_id = ?` 进行数据物理/逻辑隔离。
2. **主外键关系**：通过 `FOREIGN KEY` 约束保证数据一致性（在微服务高并发场景下，若对性能有极致要求，应用层可降级为逻辑外键，但此处遵照要求提供物理外键设计）。
3. **索引设计**：针对多租户的 `customer_id`、关联查询的外键、以及状态字段建立 B-Tree 索引；对存储分析数据和爬虫原始数据的字段使用 `JSONB` 格式，便于灵活扩展。

---

## DDL 与 表结构

```sql
-- ==========================================
-- 1. 客户表 (Customer)
-- ==========================================
CREATE TABLE customer (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20),
    status SMALLINT DEFAULT 1, -- 1:正常, 0:禁用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE customer IS '客户（租户）信息表';

-- ==========================================
-- 2. 系统管理员表 (Sys Admin)
-- ==========================================
CREATE TABLE sys_admin (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_type VARCHAR(20) NOT NULL, -- 'SUPER_ADMIN', 'NORMAL_ADMIN'
    customer_id BIGINT, -- 超级管理员为NULL，普通管理员绑定特定客户
    status SMALLINT DEFAULT 1, -- 1:正常, 0:禁用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL
);
COMMENT ON TABLE sys_admin IS '系统管理员表';
CREATE INDEX idx_sys_admin_customer_id ON sys_admin(customer_id);

-- ==========================================
-- 3. 插件用户表 (Plugin User)
-- ==========================================
CREATE TABLE plugin_user (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status SMALLINT DEFAULT 0, -- 0:待审核, 1:正常, 2:禁用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
COMMENT ON TABLE plugin_user IS '插件注册用户表';
CREATE INDEX idx_plugin_user_customer_id ON plugin_user(customer_id);
CREATE INDEX idx_plugin_user_status ON plugin_user(status);

-- ==========================================
-- 4. 文件与简历信息表 (Resume Info)
-- ==========================================
CREATE TABLE resume_info (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    minio_url VARCHAR(500) NOT NULL,
    parse_status SMALLINT DEFAULT 0, -- 0:待解析, 1:解析成功, 2:解析失败
    parsed_content JSONB, -- 存储提取后的结构化技能、经验等文本
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_user FOREIGN KEY (user_id) REFERENCES plugin_user(id) ON DELETE CASCADE
);
COMMENT ON TABLE resume_info IS 'PDF简历解析与MinIO存储映射表';
CREATE INDEX idx_resume_info_customer_id ON resume_info(customer_id);
CREATE INDEX idx_resume_info_user_id ON resume_info(user_id);

-- ==========================================
-- 5. 岗位资源池表 (Job Pool)
-- ==========================================
-- 注意：资源池是全局的，供所有客户分配，因此无 customer_id
CREATE TABLE job_pool (
    id BIGSERIAL PRIMARY KEY,
    source_type SMALLINT NOT NULL, -- 1:禾蛙爬虫, 2:手动新增, 3:Excel导入
    job_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    salary_range VARCHAR(50),
    city VARCHAR(50),
    experience_req VARCHAR(50),
    education_req VARCHAR(50),
    job_status SMALLINT DEFAULT 1, -- 1:招聘中(上架), 0:已关闭(下架)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE job_pool IS '公共岗位资源池表';
CREATE INDEX idx_job_pool_city_status ON job_pool(city, job_status);

-- ==========================================
-- 6. 账号岗位下发关联表 (User Job Relation)
-- ==========================================
CREATE TABLE user_job_relation (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    deliver_status SMALLINT DEFAULT 0, -- 0:未投递, 1:投递中, 2:已投递, 3:投递失败
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_relation_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_relation_user FOREIGN KEY (user_id) REFERENCES plugin_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_relation_job FOREIGN KEY (job_id) REFERENCES job_pool(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_job UNIQUE (user_id, job_id) -- 防止给同一用户下发重复岗位
);
COMMENT ON TABLE user_job_relation IS '账号与可投递岗位的下发映射表';
CREATE INDEX idx_user_job_customer_id ON user_job_relation(customer_id);
CREATE INDEX idx_user_job_user_status ON user_job_relation(user_id, deliver_status);

-- ==========================================
-- 7. 投递记录表 (Deliver Record)
-- ==========================================
CREATE TABLE deliver_record (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    resume_id BIGINT, -- 投递时使用的具体简历
    deliver_status SMALLINT NOT NULL, -- 1:成功, 2:失败
    fail_reason TEXT,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deliver_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_deliver_user FOREIGN KEY (user_id) REFERENCES plugin_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_deliver_job FOREIGN KEY (job_id) REFERENCES job_pool(id) ON DELETE CASCADE
);
COMMENT ON TABLE deliver_record IS '插件一键投递的结果记录表';
CREATE INDEX idx_deliver_record_customer_id ON deliver_record(customer_id);
CREATE INDEX idx_deliver_record_user_id ON deliver_record(user_id);
CREATE INDEX idx_deliver_record_time ON deliver_record(delivered_at);

-- ==========================================
-- 8. 禾蛙爬虫原始数据表 (Hewa Job)
-- ==========================================
CREATE TABLE hewa_job (
    id BIGSERIAL PRIMARY KEY,
    origin_job_id VARCHAR(100) UNIQUE NOT NULL, -- 禾蛙平台原ID，防重
    job_name VARCHAR(200),
    company_name VARCHAR(200),
    raw_data JSONB, -- 爬取的原始全量JSON数据
    process_status SMALLINT DEFAULT 0, -- 0:未清洗入库, 1:已入库到job_pool, 2:废弃
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE hewa_job IS '爬虫抓取的禾蛙原始数据表';
CREATE INDEX idx_hewa_job_status ON hewa_job(process_status);

-- ==========================================
-- 9. 爬虫定时任务表 (Cron Task)
-- ==========================================
CREATE TABLE cron_task (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    cron_expr VARCHAR(50) NOT NULL,
    task_params JSONB, -- 筛选条件：城市、薪资等
    status SMALLINT DEFAULT 1, -- 1:启用, 0:暂停
    last_run_time TIMESTAMP,
    next_run_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cron_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
COMMENT ON TABLE cron_task IS '每个客户独立配置的爬虫周期任务';
CREATE INDEX idx_cron_task_customer_id ON cron_task(customer_id);

-- ==========================================
-- 10. AI 分析报告表 (AI Report)
-- ==========================================
CREATE TABLE ai_report (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    report_type SMALLINT NOT NULL, -- 1:岗位分析, 2:人岗匹配分析
    report_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
COMMENT ON TABLE ai_report IS 'AI自动生成的分析报告';
CREATE INDEX idx_ai_report_customer_id ON ai_report(customer_id);

-- ==========================================
-- 11. 系统操作日志表 (Operation Log)
-- ==========================================
CREATE TABLE operation_log (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT, -- 系统级操作为空
    operator_id BIGINT NOT NULL,
    operator_type SMALLINT NOT NULL, -- 1:Admin, 2:PluginUser
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE operation_log IS '全量操作日志记录表，不可篡改';
-- 对于日志表，主要针对时间、客户和操作人查询建立索引
CREATE INDEX idx_op_log_customer_id ON operation_log(customer_id);
CREATE INDEX idx_op_log_operator ON operation_log(operator_type, operator_id);
CREATE INDEX idx_op_log_time ON operation_log(created_at);

```

## 关键设计说明

### 1. 多租户（客户）隔离实现
- **物理表层面**：每一张属于租户私有数据的表（如 `plugin_user`, `resume_info`, `user_job_relation`, `deliver_record` 等）都强制包含 `customer_id` 字段。
- **关联级联删除**：设置了 `ON DELETE CASCADE`。当在 `customer` 表中删除某个客户时，其下的所有账号、简历、投递记录将自动被数据库级联清理，防止产生脏数据。
- **系统层隔离**：`job_pool`（岗位池）和 `hewa_job`（爬虫原始数据）属于全局共享资源池，不携带 `customer_id`，只有当岗位通过 `user_job_relation` 下发给用户时，才与具体的 `customer_id` 产生绑定关系。

### 2. 索引设计考量
- **外键索引用途**：PostgreSQL 默认不会为 Foreign Key 自动创建索引。为防止在关联查询以及级联删除时引发全表扫描甚至死锁，对所有 `customer_id`, `user_id`, `job_id` 等外键字段显式创建了 B-Tree 索引。
- **组合索引**：例如在 `user_job_relation` 表中，使用了 `(user_id, deliver_status)` 的组合索引，极大优化了插件端频繁拉取“待投递岗位列表”的查询性能。
- **防重唯一索引**：在 `user_job_relation` 建立 `UNIQUE (user_id, job_id)`，从数据库层面拦截重复下发同一岗位的错误；在 `hewa_job` 建立 `UNIQUE (origin_job_id)` 防止爬虫重复爬取入库。

### 3. JSONB 灵活拓展
- `resume_info.parsed_content`: 由于不同用户的简历提取出的结构化特征可能各式各样，将其作为 `JSONB` 存储可以避免频繁修改表字段。
- `cron_task.task_params`: 针对不同客户定制化的爬虫过滤条件（如城市多选、薪资范围），采用 JSONB 可以做到极大的灵活配置。
- `operation_log.details`: 操作记录涉及不同模块的参数留痕，采用 JSONB 记录接口请求 Payload 更加合适。后期如果需要通过 JSON 内部字段检索日志，还可以为其追加 **GIN 索引**。
