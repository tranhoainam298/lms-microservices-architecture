console.error(
  'This legacy seeder is disabled because it used obsolete schemas and unsafe local credentials. '
  + 'Run seed-demo-data.bat from the project root instead.'
);
process.exitCode = 1;
