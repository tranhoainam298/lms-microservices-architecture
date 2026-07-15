import React from 'react';
import CourseCard from '../components/CourseCard';

const initialFilters = { search: '', category: '', priceType: '', minPrice: '', maxPrice: '' };

export default function StudentCatalogPage({ courses, enrolledCourseIds, loading, error, onFiltersChange, onNavigate }) {
  const [filters, setFilters] = React.useState(initialFilters);
  const publishedCourses = courses.filter(course => course.status === 'published');
  const categories = [...new Set(publishedCourses.map(course => course.category).filter(Boolean))].sort();

  const applyFilters = event => {
    event.preventDefault();
    onFiltersChange(filters);
  };
  const clearFilters = () => {
    setFilters(initialFilters);
    onFiltersChange(initialFilters);
  };

  return <section className="page-stack" aria-labelledby="student-catalog-title">
    <header className="page-intro"><p className="page-kicker">Course catalog</p><h2 className="page-title" id="student-catalog-title">Find your next course</h2><p className="page-description">Search published courses, compare learning outlines, and continue or enroll from one place.</p></header>
    <form className="card" onSubmit={applyFilters} aria-label="Course catalog filters">
      <div className="form-grid">
        <label className="form-field"><span>Search</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder="Course title or topic" /></label>
        <label className="form-field"><span>Category</span><select value={filters.category} onChange={event => setFilters(value => ({ ...value, category: event.target.value }))}><option value="">All categories</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
        <label className="form-field"><span>Course type</span><select value={filters.priceType} onChange={event => setFilters(value => ({ ...value, priceType: event.target.value }))}><option value="">Free and paid</option><option value="free">Free courses</option><option value="paid">Paid courses</option></select></label>
        <label className="form-field"><span>Minimum price</span><input type="number" min="0" step="0.01" value={filters.minPrice} onChange={event => setFilters(value => ({ ...value, minPrice: event.target.value }))} placeholder="0" /></label>
        <label className="form-field"><span>Maximum price</span><input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={event => setFilters(value => ({ ...value, maxPrice: event.target.value }))} placeholder="Any" /></label>
      </div>
      <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search courses'}</button><button className="btn btn-ghost" type="button" onClick={clearFilters} disabled={loading}>Clear filters</button></div>
    </form>
    {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
    {loading && publishedCourses.length === 0 ? <div className="card" role="status">Loading published courses...</div> : publishedCourses.length === 0 ? <div className="card empty-state" role="status"><strong>No matching courses</strong><p>Adjust the filters to explore more learning options.</p></div> : <div className="course-grid">{publishedCourses.map(course => {
      const isEnrolled = enrolledCourseIds.has(Number(course.id));
      return <CourseCard key={course.id} course={course} isEnrolled={isEnrolled} actionLabel={isEnrolled ? 'Continue Learning' : 'View Course'} onAction={() => onNavigate(isEnrolled ? 'lesson' : 'course-detail', { courseId: course.id, course })} />;
    })}</div>}
  </section>;
}
