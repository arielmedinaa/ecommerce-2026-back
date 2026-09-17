DROP PROCEDURE IF EXISTS proc_obtener_articulos_ecommerce_web;

DELIMITER $$

CREATE DEFINER=`root`@`%` PROCEDURE `proc_obtener_articulos_ecommerce_web`(
    IN p_limit INT,
    IN p_offset INT,
    IN p_codigo_marca VARCHAR(30),
    IN p_codigo_categoria VARCHAR(30),
    IN p_codigo_proveedor VARCHAR(30),
    IN p_precio_min DECIMAL(15,2),
    IN p_precio_max DECIMAL(15,2),
    IN p_solo_con_stock TINYINT,
    IN p_busqueda VARCHAR(150)
)
BEGIN
    DECLARE v_limit BIGINT DEFAULT 0;
    DECLARE v_offset BIGINT DEFAULT 0;
    DECLARE v_busqueda VARCHAR(150) DEFAULT NULL;
    DECLARE v_busqueda_clean VARCHAR(160) DEFAULT NULL;
    DECLARE v_tok_count INT DEFAULT 0;
    DECLARE v_tok1 VARCHAR(60) DEFAULT NULL;
    DECLARE v_tok2 VARCHAR(60) DEFAULT NULL;
    DECLARE v_tok3 VARCHAR(60) DEFAULT NULL;
    DECLARE v_tok4 VARCHAR(60) DEFAULT NULL;
    DECLARE v_fuzzy_i INT DEFAULT 0;
    DECLARE v_fuzzy_token VARCHAR(60) DEFAULT NULL;
    DECLARE v_fuzzy_threshold INT DEFAULT 0;
    DECLARE v_is_multi TINYINT DEFAULT 0;
    DECLARE v_alt_segments INT DEFAULT 0;
    DECLARE v_alt1 VARCHAR(150) DEFAULT NULL;
    DECLARE v_alt2 VARCHAR(150) DEFAULT NULL;
    DECLARE v_alt3 VARCHAR(150) DEFAULT NULL;
    DECLARE v_alt4 VARCHAR(150) DEFAULT NULL;
    DECLARE v_relevance_term VARCHAR(150) DEFAULT NULL;

    SET v_limit = IF(p_limit IS NULL OR p_limit <= 0, 1000000, p_limit);
    SET v_offset = IF(p_offset IS NULL OR p_offset < 0, 0, p_offset);
    SET v_busqueda = IF(p_busqueda IS NULL OR TRIM(p_busqueda) = '', NULL, TRIM(p_busqueda));

    IF v_busqueda IS NOT NULL AND LOCATE('||', v_busqueda) > 0 THEN
        SET v_is_multi = 1;
        SET v_alt_segments = (LENGTH(v_busqueda) - LENGTH(REPLACE(v_busqueda, '||', ''))) DIV 2 + 1;
        SET v_alt1 = NULLIF(TRIM(SUBSTRING_INDEX(v_busqueda, '||', 1)), '');
        SET v_alt2 = IF(v_alt_segments >= 2, NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda, '||', 2), '||', -1)), ''), NULL);
        SET v_alt3 = IF(v_alt_segments >= 3, NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda, '||', 3), '||', -1)), ''), NULL);
        SET v_alt4 = IF(v_alt_segments >= 4, NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda, '||', 4), '||', -1)), ''), NULL);
    END IF;

    SET v_relevance_term = IF(v_is_multi = 1, v_alt1, v_busqueda);

    IF v_is_multi = 0 AND v_busqueda IS NOT NULL THEN
        SET v_busqueda_clean = CONCAT(' ', LOWER(v_busqueda), ' ');
        SET v_busqueda_clean = REPLACE(v_busqueda_clean, ' pulgadas ', ' ');
        SET v_busqueda_clean = REPLACE(v_busqueda_clean, ' pulgada ', ' ');
        SET v_busqueda_clean = REPLACE(v_busqueda_clean, ' pulg ', ' ');
        SET v_busqueda_clean = REPLACE(v_busqueda_clean, ' inch ', ' ');
        SET v_busqueda_clean = REPLACE(v_busqueda_clean, ' inches ', ' ');
        SET v_busqueda_clean = TRIM(v_busqueda_clean);
        IF v_busqueda_clean = '' THEN
            SET v_busqueda_clean = NULL;
        END IF;
    END IF;

    IF v_busqueda_clean IS NOT NULL THEN
        SET v_tok_count = LENGTH(v_busqueda_clean) - LENGTH(REPLACE(v_busqueda_clean, ' ', '')) + 1;
        SET v_tok1 = NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda_clean, ' ', 1), ' ', -1)), '');
        SET v_tok2 = IF(v_tok_count >= 2, NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda_clean, ' ', 2), ' ', -1)), ''), NULL);
        SET v_tok3 = IF(v_tok_count >= 3, NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda_clean, ' ', 3), ' ', -1)), ''), NULL);
        SET v_tok4 = IF(v_tok_count >= 4, NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(v_busqueda_clean, ' ', 4), ' ', -1)), ''), NULL);
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_ids;
    DROP TEMPORARY TABLE IF EXISTS tmp_stock;
    DROP TEMPORARY TABLE IF EXISTS tmp_proveedor;
    DROP TEMPORARY TABLE IF EXISTS tmp_resultado;
    DROP TEMPORARY TABLE IF EXISTS tmp_base;
    DROP TEMPORARY TABLE IF EXISTS tmp_words;
    DROP TEMPORARY TABLE IF EXISTS tmp_score_proveedor;

    CREATE TEMPORARY TABLE tmp_score_proveedor ENGINE=InnoDB AS
    SELECT proveedor, clasificacion, score
    FROM (
        SELECT proveedor, clasificacion, score,
               ROW_NUMBER() OVER (
                   PARTITION BY proveedor
                   ORDER BY CASE WHEN clasificacion IN ('Estratégico','Confiable') THEN 0 ELSE 1 END,
                            score DESC
               ) AS rn
        FROM ssss_emp1.cs_score_proveedor
    ) ranked
    WHERE rn = 1;

    ALTER TABLE tmp_score_proveedor ADD PRIMARY KEY (proveedor);

    CREATE TEMPORARY TABLE tmp_ids ENGINE=InnoDB AS
    SELECT a.codigo_articulo
    FROM ssss_emp1.articulo a
    LEFT JOIN tmp_score_proveedor sp ON sp.proveedor = COALESCE(
        (SELECT c.proveedor FROM ssss_emp1.compradet c
         WHERE c.codigo_articulo = a.codigo_articulo
         ORDER BY c.secuencia DESC LIMIT 1),
        a.proveedor)
    WHERE a.baja = 0
      AND (a.websc = 1 OR a.web = 1)
      AND (p_codigo_marca IS NULL OR TRIM(p_codigo_marca) = '' OR a.marca = CAST(p_codigo_marca AS UNSIGNED))
      AND (p_codigo_categoria IS NULL OR TRIM(p_codigo_categoria) = '' OR a.familia = CAST(p_codigo_categoria AS UNSIGNED))
      AND (p_codigo_proveedor IS NULL OR TRIM(p_codigo_proveedor) = '' OR a.proveedor = CAST(p_codigo_proveedor AS UNSIGNED))
      AND (p_precio_min IS NULL OR a.precioventa >= p_precio_min)
      AND (p_precio_max IS NULL OR a.precioventa <= p_precio_max)
      AND a.precioventa >= 9000
      AND (v_busqueda IS NULL
           OR (v_is_multi = 0 AND (
                TRIM(a.codigo) = v_busqueda
                OR a.codigodebarra = v_busqueda
                OR (
                     (v_tok1 IS NULL OR fn_match_termino_articulo(a.nombre, v_tok1) = 1)
                     AND (v_tok2 IS NULL OR fn_match_termino_articulo(a.nombre, v_tok2) = 1)
                     AND (v_tok3 IS NULL OR fn_match_termino_articulo(a.nombre, v_tok3) = 1)
                     AND (v_tok4 IS NULL OR fn_match_termino_articulo(a.nombre, v_tok4) = 1)
                   )
              ))
           OR (v_is_multi = 1 AND (
                (v_alt1 IS NOT NULL AND fn_match_termino_articulo(a.nombre, v_alt1) = 1)
                OR (v_alt2 IS NOT NULL AND fn_match_termino_articulo(a.nombre, v_alt2) = 1)
                OR (v_alt3 IS NOT NULL AND fn_match_termino_articulo(a.nombre, v_alt3) = 1)
                OR (v_alt4 IS NOT NULL AND fn_match_termino_articulo(a.nombre, v_alt4) = 1)
              ))
          )
      AND EXISTS (SELECT 1 FROM ssss_emp1.tbl_stock_actual sa
                  JOIN ssss_emp1.deposito d ON d.codigo = sa.deposito
                  WHERE sa.codigo_articulo = a.codigo_articulo
                    AND d.habilitado_reserva = 1 AND d.codigo NOT IN (19,20,26,27,28,33) AND d.codigo_proveedor = 0
                    AND sa.cantidad_actual > 0)
    ORDER BY
        CASE
            WHEN v_busqueda IS NULL THEN 1
            WHEN TRIM(a.codigo) = v_busqueda OR a.codigodebarra = v_busqueda THEN 0
            WHEN v_relevance_term IS NOT NULL AND LOWER(a.nombre) LIKE CONCAT('%', LOWER(v_relevance_term), '%') THEN 0
            ELSE 1
        END,
        COALESCE((
            SELECT CASE tr2.nombre_ticket
                       WHEN 'Ticket Bajo' THEN 0
                       WHEN 'Ticket Medio' THEN 1
                       WHEN 'Ticket Alto' THEN 2
                       ELSE 3
                   END
              FROM ssss_emp1.cs_pautas_meta_ticket_rangos tr2
             WHERE tr2.activo = 1
               AND a.precioventa >= tr2.monto_desde
               AND (tr2.monto_hasta IS NULL OR a.precioventa <= tr2.monto_hasta)
             ORDER BY tr2.monto_desde DESC
             LIMIT 1
        ), 3),
        CASE WHEN sp.clasificacion IN ('Estratégico','Confiable') THEN 0 ELSE 1 END,
        CASE WHEN sp.clasificacion IN ('Estratégico','Confiable') THEN sp.score END DESC,
        a.nombre ASC, a.codigo_articulo ASC
    LIMIT v_limit OFFSET v_offset;

    IF v_offset = 0 AND v_is_multi = 0 AND v_busqueda_clean IS NOT NULL AND (SELECT COUNT(*) FROM tmp_ids) = 0 THEN
        CREATE TEMPORARY TABLE tmp_base ENGINE=InnoDB AS
        SELECT a.codigo_articulo, a.nombre
        FROM ssss_emp1.articulo a FORCE INDEX (idx_keyset)
        WHERE a.baja = 0
          AND (a.websc = 1 OR a.web = 1)
          AND (p_codigo_marca IS NULL OR TRIM(p_codigo_marca) = '' OR a.marca = CAST(p_codigo_marca AS UNSIGNED))
          AND (p_codigo_categoria IS NULL OR TRIM(p_codigo_categoria) = '' OR a.familia = CAST(p_codigo_categoria AS UNSIGNED))
          AND (p_codigo_proveedor IS NULL OR TRIM(p_codigo_proveedor) = '' OR a.proveedor = CAST(p_codigo_proveedor AS UNSIGNED))
          AND (p_precio_min IS NULL OR a.precioventa >= p_precio_min)
          AND (p_precio_max IS NULL OR a.precioventa <= p_precio_max)
          AND a.precioventa >= 9000
          AND EXISTS (SELECT 1 FROM ssss_emp1.tbl_stock_actual sa
                      JOIN ssss_emp1.deposito d ON d.codigo = sa.deposito
                      WHERE sa.codigo_articulo = a.codigo_articulo
                        AND d.habilitado_reserva = 1 AND d.codigo NOT IN (19,20,26,27,28,33) AND d.codigo_proveedor = 0
                        AND sa.cantidad_actual > 0)
        ORDER BY a.nombre ASC
        LIMIT 60000;

        ALTER TABLE tmp_base ADD PRIMARY KEY (codigo_articulo);

        CREATE TEMPORARY TABLE tmp_words ENGINE=InnoDB AS
        SELECT b.codigo_articulo,
               TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(b.nombre, ' ', n.n), ' ', -1)) AS word
        FROM tmp_base b
        JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
              UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) n
          ON CHAR_LENGTH(b.nombre) - CHAR_LENGTH(REPLACE(b.nombre, ' ', '')) >= n.n - 1
        WHERE TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(b.nombre, ' ', n.n), ' ', -1)) <> '';

        CREATE INDEX idx_tmp_words_art ON tmp_words (codigo_articulo);

        SET v_fuzzy_i = 1;
        WHILE v_fuzzy_i <= v_tok_count AND v_fuzzy_i <= 4 AND (SELECT COUNT(*) FROM tmp_base) > 0 DO
            SET v_fuzzy_token = CASE v_fuzzy_i WHEN 1 THEN v_tok1 WHEN 2 THEN v_tok2 WHEN 3 THEN v_tok3 ELSE v_tok4 END;
            IF v_fuzzy_token IS NOT NULL AND LENGTH(v_fuzzy_token) >= 3 THEN
                SET v_fuzzy_threshold = 1;
                DELETE b FROM tmp_base b
                WHERE NOT EXISTS (
                    SELECT 1 FROM tmp_words w
                    WHERE w.codigo_articulo = b.codigo_articulo
                      AND (
                            w.word LIKE CONCAT('%', v_fuzzy_token, '%')
                            OR (
                                 LEFT(LOWER(w.word), 1) = LEFT(v_fuzzy_token, 1)
                                 AND ABS(CHAR_LENGTH(w.word) - CHAR_LENGTH(v_fuzzy_token)) <= 1
                                 AND fn_levenshtein(v_fuzzy_token, LOWER(w.word)) <= v_fuzzy_threshold
                               )
                          )
                );
            END IF;
            SET v_fuzzy_i = v_fuzzy_i + 1;
        END WHILE;

        DELETE FROM tmp_ids;
        INSERT INTO tmp_ids (codigo_articulo)
        SELECT codigo_articulo FROM tmp_base ORDER BY nombre ASC LIMIT v_limit;
    END IF;

    ALTER TABLE tmp_ids ADD PRIMARY KEY (codigo_articulo);

    CREATE TEMPORARY TABLE tmp_stock ENGINE=InnoDB AS
    SELECT sa.codigo_articulo, SUM(sa.cantidad_actual) AS stock_total
    FROM ssss_emp1.tbl_stock_actual sa
    JOIN ssss_emp1.deposito d ON d.codigo = sa.deposito
    JOIN tmp_ids ids ON ids.codigo_articulo = sa.codigo_articulo
    WHERE d.habilitado_reserva = 1 AND d.codigo NOT IN (19,20,26,27,28,33) AND d.codigo_proveedor = 0
    GROUP BY sa.codigo_articulo;

    ALTER TABLE tmp_stock ADD PRIMARY KEY (codigo_articulo);

    CREATE TEMPORARY TABLE tmp_proveedor ENGINE=InnoDB AS
    SELECT c1.codigo_articulo, c1.proveedor
    FROM ssss_emp1.compradet c1
    JOIN (
        SELECT c2i.codigo_articulo, MAX(c2i.secuencia) AS max_sec
        FROM ssss_emp1.compradet c2i
        JOIN tmp_ids ids ON ids.codigo_articulo = c2i.codigo_articulo
        GROUP BY c2i.codigo_articulo
    ) c2 ON c1.codigo_articulo = c2.codigo_articulo AND c1.secuencia = c2.max_sec;

    ALTER TABLE tmp_proveedor ADD PRIMARY KEY (codigo_articulo);

    CREATE TEMPORARY TABLE tmp_resultado ENGINE=InnoDB AS
    SELECT
        TRIM(a.codigo) AS codigo_articulo,
        a.nombre AS nombre_articulo,
        a.preciocosto, a.recargo, a.recargosug, a.web, a.websc,
        a.familia AS codigo_categoria,
        f.nombre AS nombre_categoria,
        a.subfamilia AS codigo_subcategoria,
        sf.nombre AS nombre_subcategoria,
        a.marca AS codigo_marca,
        m.nombre AS nombre_marca,
        COALESCE(tp.proveedor, a.proveedor) AS codigo_proveedor,
        pv.nombre AS nombre_proveedor,
        COALESCE(s.stock_total, 0) AS stock_actual,
        a.precioventa, a.preciotope,
        0 AS dias_transcurridos,
        'PARADO' AS estado_movimiento,
        a.codigodebarra AS codigo_de_barra,
        a.nota,
        CASE
            WHEN v_busqueda IS NULL THEN 1
            WHEN TRIM(a.codigo) = v_busqueda OR a.codigodebarra = v_busqueda THEN 0
            WHEN v_relevance_term IS NOT NULL AND LOWER(a.nombre) LIKE CONCAT('%', LOWER(v_relevance_term), '%') THEN 0
            ELSE 1
        END AS _match_relevance,
        COALESCE((
            SELECT CASE tr2.nombre_ticket
                       WHEN 'Ticket Bajo' THEN 0
                       WHEN 'Ticket Medio' THEN 1
                       WHEN 'Ticket Alto' THEN 2
                       ELSE 3
                   END
              FROM ssss_emp1.cs_pautas_meta_ticket_rangos tr2
             WHERE tr2.activo = 1
               AND a.precioventa >= tr2.monto_desde
               AND (tr2.monto_hasta IS NULL OR a.precioventa <= tr2.monto_hasta)
             ORDER BY tr2.monto_desde DESC
             LIMIT 1
        ), 3) AS _tier_ticket,
        CASE WHEN sp.clasificacion IN ('Estratégico','Confiable') THEN 0 ELSE 1 END AS _prioridad_tier,
        CASE WHEN sp.clasificacion IN ('Estratégico','Confiable') THEN sp.score END AS _prioridad_score
    FROM tmp_ids ids
    JOIN ssss_emp1.articulo a ON a.codigo_articulo = ids.codigo_articulo
    JOIN ssss_emp1.familia f ON a.familia = f.codigo
    JOIN ssss_emp1.subfamilia sf ON a.subfamilia = sf.codigo
    JOIN ssss_emp1.marca m ON a.marca = m.codigo
    LEFT JOIN tmp_proveedor tp ON tp.codigo_articulo = ids.codigo_articulo
    LEFT JOIN ssss_emp1.proveedor pv ON pv.codigo = COALESCE(tp.proveedor, a.proveedor)
    LEFT JOIN tmp_stock s ON s.codigo_articulo = ids.codigo_articulo
    LEFT JOIN tmp_score_proveedor sp ON sp.proveedor = COALESCE(tp.proveedor, a.proveedor)
    ORDER BY _match_relevance ASC, _tier_ticket ASC, _prioridad_tier ASC, _prioridad_score DESC, a.nombre ASC, a.codigo_articulo ASC;

    SELECT
        codigo_articulo, nombre_articulo, preciocosto, recargo, recargosug,
        web, websc, CAST(codigo_categoria AS CHAR) AS codigo_categoria, nombre_categoria,
        CAST(codigo_subcategoria AS CHAR) AS codigo_subcategoria, nombre_subcategoria,
        CAST(codigo_marca AS CHAR) AS codigo_marca, nombre_marca,
        CAST(codigo_proveedor AS CHAR) AS codigo_proveedor, nombre_proveedor,
        stock_actual, precioventa, preciotope, dias_transcurridos, estado_movimiento,
        codigo_de_barra, nota,
        0 AS cantidad_compras, 0 AS cantidad_entradas, 0 AS cantidad_ventas,
        0 AS cantidad_salidas, 0 AS cantidad_transferencias_salida,
        0 AS cantidad_transferencias_entrada, 0.0 AS nuevo_costo
    FROM tmp_resultado
    ORDER BY _match_relevance ASC, _tier_ticket ASC, _prioridad_tier ASC, _prioridad_score DESC, nombre_articulo ASC, codigo_articulo ASC;

    DROP TEMPORARY TABLE IF EXISTS tmp_ids;
    DROP TEMPORARY TABLE IF EXISTS tmp_stock;
    DROP TEMPORARY TABLE IF EXISTS tmp_proveedor;
    DROP TEMPORARY TABLE IF EXISTS tmp_resultado;
    DROP TEMPORARY TABLE IF EXISTS tmp_base;
    DROP TEMPORARY TABLE IF EXISTS tmp_words;
    DROP TEMPORARY TABLE IF EXISTS tmp_score_proveedor;
END $$

DELIMITER ;
