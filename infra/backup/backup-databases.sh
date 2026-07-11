#!/bin/sh
set -eu

timestamp="$(date -u +%Y%m%d-%H%M%S)"
backup_dir="/backups/${timestamp}"

if ! mkdir "${backup_dir}"; then
  echo "Backup directory already exists: ${backup_dir}" >&2
  exit 1
fi

dump_database() {
  label="$1"
  host="$2"
  user="$3"
  password="$4"
  database="$5"
  output="$6"

  echo "Backing up ${label}..."
  if ! MYSQL_PWD="${password}" mysqldump \
    --host="${host}" \
    --user="${user}" \
    --single-transaction \
    --skip-lock-tables \
    --skip-add-drop-table \
    --no-tablespaces \
    --set-gtid-purged=OFF \
    "${database}" > "${backup_dir}/${output}"; then
    echo "Backup failed for ${label}. Previous backup directories were not changed." >&2
    exit 1
  fi
}

dump_database "User DB" "${USER_DB_HOST}" "${USER_DB_USER}" "${USER_DB_PASSWORD}" "${USER_DB_NAME}" "user-db.sql"
dump_database "Course DB" "${COURSE_DB_HOST}" "${COURSE_DB_USER}" "${COURSE_DB_PASSWORD}" "${COURSE_DB_NAME}" "course-db.sql"
dump_database "Exam DB" "${EXAM_DB_HOST}" "${EXAM_DB_USER}" "${EXAM_DB_PASSWORD}" "${EXAM_DB_NAME}" "exam-db.sql"
dump_database "Payment DB" "${PAYMENT_DB_HOST}" "${PAYMENT_DB_USER}" "${PAYMENT_DB_PASSWORD}" "${PAYMENT_DB_NAME}" "payment-db.sql"

for dump_file in user-db.sql course-db.sql exam-db.sql payment-db.sql; do
  if [ ! -s "${backup_dir}/${dump_file}" ]; then
    echo "Backup validation failed: ${dump_file} is empty." >&2
    exit 1
  fi
  echo "Created ${backup_dir}/${dump_file}"
done

echo "Backup completed: ${backup_dir}"
