-- 3S Admin content schema (Aurora DSQL). Every row is keyed by site.
-- Aurora DSQL runs one DDL statement per transaction; db-migrate.mjs splits on ";".
-- Record bodies are JSON text: the app never queries inside them.

CREATE TABLE IF NOT EXISTS content_records (
  site        varchar(40)  NOT NULL,
  collection  varchar(60)  NOT NULL,
  id          varchar(120) NOT NULL,
  sort_order  integer      NOT NULL DEFAULT 0,
  is_active   boolean      NOT NULL DEFAULT true,
  data        text         NOT NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (site, collection, id)
);

CREATE TABLE IF NOT EXISTS collection_meta (
  site        varchar(40)  NOT NULL,
  collection  varchar(60)  NOT NULL,
  categories  text         NOT NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (site, collection)
);

-- Keyed (site, at, id) so "latest activity for a site" is a single range scan.
CREATE TABLE IF NOT EXISTS activity_log (
  site        varchar(40)  NOT NULL,
  at          timestamptz  NOT NULL,
  id          uuid         NOT NULL,
  user_email  varchar(254),
  user_name   varchar(120),
  action      varchar(20)  NOT NULL,
  collection  varchar(60),
  record_id   varchar(120),
  title       varchar(300),
  PRIMARY KEY (site, at, id)
);
