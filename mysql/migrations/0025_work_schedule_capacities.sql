CREATE TABLE work_schedule_capacities (department_id VARCHAR(36) NOT NULL,day VARCHAR(10) NOT NULL,capacity INT NOT NULL,updated_by VARCHAR(36) NOT NULL,updated_at VARCHAR(32) NOT NULL,PRIMARY KEY(department_id,day));
--> statement-breakpoint
CREATE TABLE work_schedule_capacity_lock (id INT PRIMARY KEY);
--> statement-breakpoint
INSERT INTO work_schedule_capacity_lock (id) VALUES (1);
