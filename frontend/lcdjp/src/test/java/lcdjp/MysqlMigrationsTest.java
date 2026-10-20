package lcdjp;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Applies every Flyway migration to a real MySQL 8.4 (the version docker-compose runs), which the H2-based
 * tests cannot prove. Skipped automatically when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
class MysqlMigrationsTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4");

    @Test
    void allMigrationsApplyAndValidateOnMysql() throws Exception {
        Flyway flyway = Flyway.configure()
                .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .locations("classpath:db/migration")
                .load();

        assertTrue(flyway.migrate().success, "migrations should apply cleanly");
        flyway.validate();

        try (Connection c = DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())) {
            for (String table : new String[] {"users", "cases"}) {
                try (ResultSet rs = c.getMetaData().getTables(null, null, table, null)) {
                    assertTrue(rs.next(), "table should exist after migrating: " + table);
                }
            }
        }
    }
}
