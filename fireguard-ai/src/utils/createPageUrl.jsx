export const createPageUrl = (pageName) => {
  const routes = {
    'Home': '/',
    'InputPage': '/input',
    'ResultsPage': '/results'
  };
  return routes[pageName] || '/';
};