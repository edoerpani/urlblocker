const URL_LISTS = [
  'https://malware-filter.gitlab.io/malware-filter/urlhaus-filter-domains-online.txt',
  'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/ALL-phishing-domains.txt',
  'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/ALL-phishing-links.txt',
  'https://malware-filter.gitlab.io/malware-filter/phishing-filter-domains.txt'
  // Add other URLs here (Github, Gitlab or any URL)
];

async function fetchURLList() {
  try {
    const responses = await Promise.all(URL_LISTS.map(url => 
      fetch(url).catch(err => {
        console.error('Fetch error for URL:', url, err);
        return { ok: false, url };
      })
    ));
    
    const texts = await Promise.all(responses.map(response => {
      if (!response.ok) {
        console.error(`Network response was not ok for ${response.url}`);
        return '';
      }
      return response.text();
    }));

    const data = texts.flatMap(text => 
      text.split('\n')
          .filter(line => line && !line.startsWith('!') && !line.startsWith('['))
          .map(url => url.trim())
    );

    console.log("Fetched data:", data);

    const normalizedData = data.map(url => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `*://${url}/*`;
      }
      return url;
    });

    console.log("Normalized data:", normalizedData);

    const rules = normalizedData.map((url, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
      condition: {
        urlFilter: url,
        resourceTypes: ["main_frame"]
      }
    }));

    console.log("Generated rules:", rules);

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(rule => rule.id),
      addRules: rules
    });

    chrome.storage.local.set({ isActive: true });
  } catch (error) {
    console.error('Failed to fetch URL list:', error);
  }
}
  // Update the list of URLs periodically
  setInterval(fetchURLList, 3600000); // Update every 1 hour
  fetchURLList();
  
  chrome.runtime.onInstalled.addListener(() => {
    fetchURLList();
  });
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.isActive !== undefined) {
      const isActive = changes.isActive.newValue;
      if (!isActive) {
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Remove all existing rules
        });
      } else {
        fetchURLList();
      }
    }
  });
  