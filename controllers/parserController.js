const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 解析网页内容，提取post-card信息和分页器数据
 * @param {import('hono').Context} c
 */
const parsePage = async (c) => {
  try {
    const url = c.req.query('url');

    if (!url) {
      return c.json({
        success: false,
        error: 'URL parameter is required'
      }, 400);
    }

    // 验证URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return c.json({
        success: false,
        error: 'Invalid URL format'
      }, 400);
    }

    // 获取HTML内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 辅助函数：将相对URL转换为绝对URL
    const resolveUrl = (relativeUrl, baseUrl) => {
      if (!relativeUrl) return '';
      
      // 如果已经是绝对URL，直接返回
      if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl;
      }
      
      // 处理协议相对URL（//example.com）
      if (relativeUrl.startsWith('//')) {
        return urlObj.protocol + relativeUrl;
      }
      
      try {
        // 使用URL构造函数自动处理相对路径和绝对路径
        return new URL(relativeUrl, baseUrl).href;
      } catch (e) {
        // 如果URL构造函数失败，尝试手动拼接
        console.warn('URL resolution failed:', e.message, relativeUrl, baseUrl);
        if (relativeUrl.startsWith('/')) {
          // 绝对路径：直接拼接到域名
          return urlObj.origin + relativeUrl;
        } else {
          // 相对路径：拼接到baseUrl
          const baseUrlObj = new URL(baseUrl);
          return new URL(relativeUrl, baseUrlObj.href).href;
        }
      }
    };

    // 提取文章信息 - 优先使用已知的HTML结构
    const posts = [];
    
    // 策略1: 优先查找article元素（最外层容器），排除广告元素
    let $cards = $('article[itemscope]').not('.ad, .advertisement, .ads, [class*="ad-"], [class*="-ad"], [id*="ad"], [id*="Ad"]');
    
    // 策略2: 如果没有article，查找包含.post-card的元素，排除广告
    if ($cards.length === 0) {
      $cards = $('.post-card').not('.ad, .advertisement, .ads, [class*="ad-"], [class*="-ad"]')
        .closest('article, .post, .item, [class*="card"], li')
        .not('.ad, .advertisement, .ads, [class*="ad-"], [class*="-ad"], [id*="ad"], [id*="Ad"]');
    }
    
    // 策略3: 查找包含itemprop="headline"的元素，排除广告
    if ($cards.length === 0) {
      $cards = $('[itemprop="headline"]').not('.ad, .advertisement, .ads, [class*="ad-"], [class*="-ad"]')
        .closest('article, .post-card, .post, .item, [class*="card"], li')
        .not('.ad, .advertisement, .ads, [class*="ad-"], [class*="-ad"], [id*="ad"], [id*="Ad"]');
    }
    
    // 策略4: 查找包含/archives/链接的a标签，然后向上查找容器，排除广告
    if ($cards.length === 0) {
      $('a[href*="/archives/"]').each((i, el) => {
        const $link = $(el);
        // 查找包含这个链接的article或post-card容器，排除广告
        const $card = $link.closest('article, .post-card, .post, .item, [class*="card"], [class*="post-item"], li')
          .not('.ad, .advertisement, .ads, [class*="ad-"], [class*="-ad"], [id*="ad"], [id*="Ad"]');
        if ($card.length > 0) {
          $cards = $cards.add($card);
        }
      });
    }
    
    // 去重
    const uniqueCards = [];
    $cards.each((i, card) => {
      if (uniqueCards.indexOf(card) === -1) {
        uniqueCards.push(card);
      }
    });
    
    uniqueCards.forEach((cardElement, index) => {
      const $card = $(cardElement);
      
      // 提取标题
      let title = $card.find('h2.post-card-title, h2[itemprop="headline"], h3[itemprop="headline"]').first().text().trim() ||
                  $card.find('[itemprop="headline"]').first().text().trim() ||
                  $card.find('h2, h3, .title, [class*="title"]').first().text().trim() || '';
      
      // 提取跳转链接
      let link = '';
      
      // 方法1: 查找包含整个post-card的a标签
      const $outerLink = $card.find('> a[href*="/archives/"]').first();
      if ($outerLink.length > 0) {
        link = $outerLink.attr('href') || '';
      }
      
      // 方法2: 查找包含/archives/的链接
      if (!link) {
        const $archivesLink = $card.find('a[href*="/archives/"]').first();
        if ($archivesLink.length > 0) {
          link = $archivesLink.attr('href') || '';
        }
      }
      
      // 方法3: 从meta标签中提取
      if (!link) {
        const metaUrl = $card.find('meta[itemprop="url"], meta[itemprop*="url"]').attr('content');
        if (metaUrl) {
          link = metaUrl.trim();
        }
      }
      
      // 方法4: 从标题链接中查找
      if (!link) {
        const $titleLink = $card.find('h2 a, h3 a, .post-card-title a, [itemprop="headline"] a').first();
        if ($titleLink.length > 0) {
          link = $titleLink.attr('href') || '';
        }
      }
      
      // 方法5: 查找任何包含href的链接
      if (!link) {
        const $anyLink = $card.find('a[href]').first();
        if ($anyLink.length > 0) {
          link = $anyLink.attr('href') || '';
        }
      }
      
      // 将相对路径转换为绝对路径
      let fullLink = '';
      if (link) {
        link = link.trim();
        fullLink = resolveUrl(link, url);
      }
      
      // 提取图片链接
      let imageUrl = '';
      
      const cardHtml = $card.html() || '';
      const loadBannerMatch = cardHtml.match(/loadBannerDirect\s*\(\s*['"]([^'"]+)['"]/);
      if (loadBannerMatch && loadBannerMatch[1]) {
        imageUrl = loadBannerMatch[1];
      }
      
      if (!imageUrl) {
        const $img = $card.find('img').first();
        if ($img.length > 0) {
          imageUrl = $img.attr('src') || 
                     $img.attr('data-src') || 
                     $img.attr('data-lazy-src') ||
                     $img.attr('data-original') ||
                     $img.attr('data-url') ||
                     $img.attr('data-lazy') || '';
        }
      }
      
      if (!imageUrl) {
        $card.find('[onclick*="loadBannerDirect"], [onclick*="loadBanner"]').each((i, el) => {
          const onclick = $(el).attr('onclick') || '';
          const match = onclick.match(/loadBannerDirect\s*\(\s*['"]([^'"]+)['"]/);
          if (match && match[1]) {
            imageUrl = match[1];
            return false; // break
          }
        });
      }
      
      if (imageUrl) {
        imageUrl = resolveUrl(imageUrl, url);
      }
        
      // 提取发布时间
      let publishTime = '';
      const dateText = $card.find('.date, .time, time, [class*="date"], [class*="time"]').first().text().trim() || 
                      $card.find('time').attr('datetime') || '';
      if (dateText) {
        publishTime = dateText;
      } else {
        const cardText = $card.text();
        const dateMatch = cardText.match(/(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/);
        if (dateMatch) {
          publishTime = dateMatch[1];
        }
      }
      
      // 提取作者
      let author = '';
      
      const $authorContainer = $card.find('[itemprop="author"]').first();
      if ($authorContainer.length > 0) {
        const authorMeta = $authorContainer.find('meta[itemprop="name"]').first();
        if (authorMeta.length > 0) {
          author = authorMeta.attr('content') || '';
          if (author) {
            author = author.trim();
          }
        }
      }
      
      if (!author) {
        const $authorMeta = $card.find('meta[itemprop="author"] meta[itemprop="name"], [itemprop="author"] meta[itemprop="name"]').first();
        if ($authorMeta.length > 0) {
          author = $authorMeta.attr('content') || '';
          if (author) {
            author = author.trim();
          }
        }
      }
      
      if (!author) {
        const $authorEl = $card.find('span[itemprop="author"], [itemprop="author"] span').first();
        if ($authorEl.length > 0) {
          author = $authorEl.text().trim().replace(/[•·]/g, '').trim();
        }
      }
      
      if (!author) {
        const authorText = $card.find('.author, [class*="author"], .by, [class*="by"]').first().text().trim() || '';
        if (authorText) {
          author = authorText.replace(/[•·]/g, '').trim();
        }
      }
      
      if (!author) {
        const cardText = $card.text();
        const authorMatch = cardText.match(/([^\s•·\n]{2,15}?)\s*[•·]/);
        if (authorMatch && authorMatch[1].trim().length >= 2 && authorMatch[1].trim().length < 20) {
          const potentialAuthor = authorMatch[1].trim();
          if (!potentialAuthor.match(/^\d/) && 
              !potentialAuthor.match(/年|月|日/) &&
              potentialAuthor.match(/[\u4e00-\u9fa5]/)) {
            author = potentialAuthor;
          }
        }
      }
        
      // 提取分类
      const categories = [];
      
      $card.find('span').each((i, el) => {
        const $el = $(el);
        const categoryText = $el.text().trim();
        const categoryClass = $el.attr('class') || '';
        
        if (categoryText && categoryText.includes(',')) {
          const categoryList = categoryText.split(',').map(c => c.trim()).filter(c => 
            c.length > 0 && 
            c.length < 30 &&
            !c.match(/年|月|日/) &&
            c !== author
          );
          categoryList.forEach(cat => {
            if (!categories.includes(cat)) {
              categories.push(cat);
            }
          });
        } else if (categoryText && 
                   categoryText.length > 0 &&
                   categoryText.length < 50 &&
                   !categoryText.match(/^\d{4}/) &&
                   !categoryText.match(/年|月|日/) &&
                   !categoryText.match(/^\d+$/) &&
                   !categoryText.match(/[•·]/) &&
                   !categoryClass.includes('date') &&
                   !categoryClass.includes('time') &&
                   !categoryClass.includes('author') &&
                   categoryText !== author &&
                   !categoryText.match(/^(小瓜妹|91瓜叔|瓜爷|传瓜哥|瓜姐姐)$/i)) {
          const cleanText = categoryText.replace(/[•·]/g, '').trim();
          if (cleanText && !categories.includes(cleanText)) {
            categories.push(cleanText);
          }
        }
      });
      
      if (link) {
        const categoryMatch = link.match(/\/category\/([^\/]+)/);
        if (categoryMatch && categoryMatch[1]) {
          const categoryFromUrl = decodeURIComponent(categoryMatch[1]);
          if (!categories.includes(categoryFromUrl)) {
            categories.push(categoryFromUrl);
          }
        }
      }
      
      $card.find('.category, [class*="category"], .tag, [class*="tag"], a[href*="/category/"]').each((i, el) => {
        const $el = $(el);
        let categoryText = $el.text().trim();
        const href = $el.attr('href') || '';
        
        if (href && href.includes('/category/')) {
          const categoryMatch = href.match(/\/category\/([^\/]+)/);
          if (categoryMatch && categoryMatch[1]) {
            categoryText = decodeURIComponent(categoryMatch[1]);
          }
        }
        
        categoryText = categoryText.replace(/[•·]/g, '').trim();
        
        if (categoryText && 
            categoryText.length > 0 &&
            categoryText.length < 50 &&
            !categoryText.match(/^\d{4}/) &&
            !categoryText.match(/年|月|日/) &&
            categoryText !== author &&
            !categories.includes(categoryText)) {
          categories.push(categoryText);
        }
      });
      
      if (title || fullLink) {
        posts.push({
          index: index + 1,
          title: title || '无标题',
          imageUrl: imageUrl || '',
          link: fullLink,
          publishTime: publishTime || '',
          author: author || '',
          categories: categories.length > 0 ? categories : []
        });
      }
    });
    
    if (posts.length === 0) {
      $('.post-card, article, .post, .item, [class*="card"], [class*="post-item"]').each((index, element) => {
        const $card = $(element);
        
        let imageUrl = $card.find('img').first().attr('src') || 
                       $card.find('img').first().attr('data-src') || 
                       $card.find('img').first().attr('data-lazy-src') || '';
        if (imageUrl) {
          imageUrl = resolveUrl(imageUrl, url);
        }
        
        let link = $card.find('a[href*="/archives/"]').first().attr('href') ||
                   $card.find('h2 a, h3 a').first().attr('href') ||
                   $card.find('a').first().attr('href') || '';
        const fullLink = link ? resolveUrl(link, url) : '';
        
        const title = $card.find('h2, h3, .title, a').first().text().trim() || '';
        
        const publishTime = $card.find('.date, .time, time').first().text().trim() || 
                           $card.find('time').attr('datetime') || '';
        
        const author = $card.find('.author, [class*="author"]').first().text().trim() || '';
        
        const categories = [];
        $card.find('span').each((i, span) => {
          const categoryText = $(span).text().trim();
          if (categoryText && 
              categoryText.length > 0 &&
              categoryText.length < 50 &&
              !categoryText.match(/^\d{4}/) &&
              !categoryText.match(/年|月|日/) &&
              !categoryText.match(/•/)) {
            const cleanText = categoryText.replace(/[•·]/g, '').trim();
            if (cleanText && !categories.includes(cleanText)) {
              categories.push(cleanText);
            }
          }
        });

        if (title || imageUrl || link) {
          posts.push({
            index: index + 1,
            title: title || '无标题',
            imageUrl: imageUrl || '',
            link: fullLink,
            publishTime: publishTime || '',
            author: author || '',
            categories: categories.length > 0 ? categories : []
          });
        }
      });
    }

    // 提取分页器数据
    const pagination = {};
    const $pageNav = $('.page-nav');
    
    if ($pageNav.length > 0) {
      let currentPage = '';
      let totalPages = '';
      
      const pageInfoText = $pageNav.find('.page-info').first().text().trim();
      if (pageInfoText) {
        const pageInfoMatch = pageInfoText.match(/(\d+)\s*\/\s*(\d+)/);
        if (pageInfoMatch) {
          currentPage = pageInfoMatch[1];
          totalPages = pageInfoMatch[2];
        }
      }
      
      if (!currentPage) {
        currentPage = $pageNav.find('.current, .active, [class*="current"]').text().trim() || 
                     $pageNav.find('a.active, li.active a').text().trim() || 
                     $pageNav.find('li.active').text().trim() || '1';
      }
      
      if (!totalPages) {
        totalPages = $pageNav.find('.total, [class*="total"]').text().trim() || 
                    $pageNav.text().match(/\/(\d+)/)?.[1] || '';
      }
      
      const pageLinks = [];
      $pageNav.find('.page-navigator a, ul a, .pagination a').each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().trim();
        const $parent = $link.parent();
        
        if (href && 
            text && 
            !$parent.hasClass('prev') && 
            !$parent.hasClass('next') &&
            !text.match(/跳转|上一页|下一页|Previous|Next/i) &&
            !$link.find('img[alt*="上一页"], img[alt*="下一页"], img[alt*="prev"], img[alt*="next"]').length) {
          const fullHref = resolveUrl(href, url);
          pageLinks.push({
            page: text,
            url: fullHref
          });
        }
      });

      let prevPage = null;
      const $prevLink = $pageNav.find('li.prev a, .prev a, [class*="prev"] a').first();
      if ($prevLink.length > 0) {
        const prevHref = $prevLink.attr('href');
        if (prevHref) {
          prevPage = resolveUrl(prevHref, url);
        }
      }
      
      if (!prevPage) {
        $pageNav.find('a img[alt*="上一页"], a img[alt*="prev"], a img[alt*="Previous"]').each((i, el) => {
          const $link = $(el).parent('a');
          if ($link.length > 0) {
            const prevHref = $link.attr('href');
            if (prevHref) {
              prevPage = resolveUrl(prevHref, url);
              return false; // break
            }
          }
        });
      }
      
      let nextPage = null;
      const $nextLink = $pageNav.find('li.next a, .next a, [class*="next"] a').first();
      if ($nextLink.length > 0) {
        const nextHref = $nextLink.attr('href');
        if (nextHref) {
          nextPage = resolveUrl(nextHref, url);
        }
      }
      
      if (!nextPage) {
        $pageNav.find('a img[alt*="下一页"], a img[alt*="next"], a img[alt*="Next"]').each((i, el) => {
          const $link = $(el).parent('a');
          if ($link.length > 0) {
            const nextHref = $link.attr('href');
            if (nextHref) {
              nextPage = resolveUrl(nextHref, url);
              return false; // break
            }
          }
        });
      }

      pagination.currentPage = currentPage || '1';
      pagination.totalPages = totalPages || '';
      pagination.pageLinks = pageLinks;
      pagination.prevPage = prevPage || null;
      pagination.nextPage = nextPage || null;
    } else {
      const $pagination = $('.pagination, .pager, [class*="page"]');
      if ($pagination.length > 0) {
        const currentPage = $pagination.find('.current, .active').text().trim() || '1';
        const totalPages = $pagination.text().match(/\/(\d+)/)?.[1] || '';
        
        const pageLinks = [];
        $pagination.find('a').each((i, el) => {
          const $link = $(el);
          const href = $link.attr('href');
          const text = $link.text().trim();
          const $parent = $link.parent();
          
          if (href && 
              text && 
              !$parent.hasClass('prev') && 
              !$parent.hasClass('next') &&
              !text.match(/跳转|上一页|下一页|Previous|Next/i)) {
            const fullHref = resolveUrl(href, url);
            pageLinks.push({
              page: text,
              url: fullHref
            });
          }
        });

        let prevPage = null;
        const $prevLink = $pagination.find('li.prev a, .prev a, [class*="prev"] a').first();
        if ($prevLink.length > 0) {
          const prevHref = $prevLink.attr('href');
          if (prevHref) {
            prevPage = resolveUrl(prevHref, url);
          }
        }
        
        let nextPage = null;
        const $nextLink = $pagination.find('li.next a, .next a, [class*="next"] a').first();
        if ($nextLink.length > 0) {
          const nextHref = $nextLink.attr('href');
          if (nextHref) {
            nextPage = resolveUrl(nextHref, url);
          }
        }

        pagination.currentPage = currentPage;
        pagination.totalPages = totalPages;
        pagination.pageLinks = pageLinks;
        pagination.prevPage = prevPage || null;
        pagination.nextPage = nextPage || null;
      }
    }

    // 过滤广告内容
    const filteredPosts = posts.filter(post => {
      if (post.link && !post.link.includes('/archives/')) {
        return false;
      }
      
      if (!post.title || post.title.length < 5 || post.title === '无标题') {
        return false;
      }
      
      if (post.link) {
        try {
          const postUrl = new URL(post.link);
          const baseUrl = new URL(url);
          if (postUrl.hostname !== baseUrl.hostname && 
              postUrl.hostname !== urlObj.hostname) {
            return false;
          }
        } catch (e) {
          // URL解析失败，保留
        }
      }
      
      const adKeywords = ['广告', '推广', '赞助', 'advertisement', 'ad', 'sponsor', 'promo'];
      const titleLower = post.title.toLowerCase();
      if (adKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
        return false;
      }
      
      if (!post.link || post.link.length === 0) {
        return false;
      }
      
      return true;
    });
    
    filteredPosts.forEach((post, index) => {
      post.index = index + 1;
    });

    return c.json({
      success: true,
      data: {
        url: url,
        posts: filteredPosts,
        pagination: Object.keys(pagination).length > 0 ? pagination : null,
        totalPosts: filteredPosts.length
      }
    });

  } catch (error) {
    console.error('Parse error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to parse page',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, 500);
  }
};

/**
 * 解析详情页内容，提取视频链接、文案和图片
 * @param {import('hono').Context} c
 */
const parseDetail = async (c) => {
  try {
    const url = c.req.query('url');

    if (!url) {
      return c.json({
        success: false,
        error: 'URL parameter is required'
      }, 400);
    }

    // 验证URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return c.json({
        success: false,
        error: 'Invalid URL format'
      }, 400);
    }

    // 获取HTML内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 辅助函数：将相对URL转换为绝对URL
    const resolveUrl = (relativeUrl, baseUrl) => {
      if (!relativeUrl) return '';
      
      if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl;
      }
      
      if (relativeUrl.startsWith('//')) {
        return urlObj.protocol + relativeUrl;
      }
      
      try {
        return new URL(relativeUrl, baseUrl).href;
      } catch (e) {
        console.warn('URL resolution failed:', e.message, relativeUrl, baseUrl);
        if (relativeUrl.startsWith('/')) {
          return urlObj.origin + relativeUrl;
        } else {
          const baseUrlObj = new URL(baseUrl);
          return new URL(relativeUrl, baseUrlObj.href).href;
        }
      }
    };

    const result = {
      url: url,
      videoUrls: [], // 改为数组，支持多个视频
      content: [],
      images: []
    };

    // 用于存储已提取的视频 URL，避免重复
    const videoUrlSet = new Set();

    /**
     * 添加视频 URL 到结果数组（自动去重）
     * @param {string} videoUrl - 视频 URL
     */
    const addVideoUrl = (videoUrl) => {
      if (!videoUrl) return;
      const resolvedUrl = resolveUrl(videoUrl, url);
      // 只添加有效的 URL（以 http、https、// 或 / 开头）
      if (resolvedUrl && (resolvedUrl.startsWith('http') || resolvedUrl.startsWith('//') || resolvedUrl.startsWith('/'))) {
        // 确保是完整的绝对 URL
        const fullUrl = resolvedUrl.startsWith('//') ? urlObj.protocol + resolvedUrl : resolvedUrl;
        if (fullUrl && !videoUrlSet.has(fullUrl)) {
          videoUrlSet.add(fullUrl);
          result.videoUrls.push(fullUrl);
        }
      }
    };

    // 方法1: 从所有 dplayer 容器中提取 video.url 链接（支持多个）
    const $dplayers = $('.dplayer, #dplayer, [class*="dplayer"], [id*="dplayer"]');
    
    $dplayers.each((i, el) => {
      const $dplayer = $(el);
      
      const dataConfig = $dplayer.attr('data-config');
      if (dataConfig) {
        try {
          const config = JSON.parse(dataConfig);
          if (config && config.video && config.video.url) {
            addVideoUrl(config.video.url);
          }
        } catch (e) {
          console.warn('Failed to parse data-config:', e.message);
        }
      }
      
      const videoData = $dplayer.attr('data-video') || 
                       $dplayer.attr('data-url') ||
                       $dplayer.attr('data-src');
      
      if (videoData) {
        try {
          const videoObj = JSON.parse(videoData);
          if (videoObj && videoObj.url) {
            addVideoUrl(videoObj.url);
          }
        } catch (e) {
          addVideoUrl(videoData);
        }
      }
    });

    // 方法2: 使用正则表达式从整个 HTML 中提取所有 data-config 中的视频链接（支持多个）
    const dataConfigPattern = /data-config\s*=\s*['"](.*?)['"]/gis;
    let dataConfigMatch;
    while ((dataConfigMatch = dataConfigPattern.exec(html)) !== null) {
      try {
        let configStr = dataConfigMatch[1];
        configStr = configStr
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"');
        
        const config = JSON.parse(configStr);
        if (config && config.video && config.video.url) {
          addVideoUrl(config.video.url);
        }
      } catch (e) {
        const urlPatterns = [
          /["']url["']\s*:\s*["']([^"']+)["']/,
          /["']url["']\s*:\s*["']([^"']*(?:\\.[^"']*)*)["']/,
          /video["']?\s*:\s*\{[^}]*["']url["']\s*:\s*["']([^"']+)["']/
        ];
        
        for (const pattern of urlPatterns) {
          const urlMatch = dataConfigMatch[1].match(pattern);
          if (urlMatch && urlMatch[1]) {
            const videoUrl = urlMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
            addVideoUrl(videoUrl);
            break;
          }
        }
      }
    }

    // 方法3: 使用正则表达式直接提取所有 .m3u8 链接
    const m3u8Patterns = [
      /(https?:\/\/[^\s"'<>\)]+\.m3u8[^\s"'<>\)]*)/gi,
      /(\/\/[^\s"'<>\)]+\.m3u8[^\s"'<>\)]*)/gi
    ];
    
    m3u8Patterns.forEach(pattern => {
      let m3u8Match;
      while ((m3u8Match = pattern.exec(html)) !== null) {
        if (m3u8Match && m3u8Match[1]) {
          addVideoUrl(m3u8Match[1]);
        }
      }
    });

    // 方法4: 从 script 标签中提取 dplayer 初始化代码中的 video.url（支持多个）
    $('script').each((i, el) => {
      const scriptContent = $(el).html() || '';
      if (!scriptContent) return;
      
      const patterns = [
        /video\s*:\s*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/g,
        /video\.url\s*=\s*['"]([^'"]+)['"]/g,
        /video\s*:\s*\{[\s\S]*?["']url["']\s*:\s*['"]([^'"]+)['"]/g,
        /new\s+DPlayer\s*\([\s\S]*?video\s*:\s*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(scriptContent)) !== null) {
          if (match && match[1]) {
            addVideoUrl(match[1].trim());
          }
        }
      });
    });

    // 方法5: 从整个 HTML 文本中搜索所有包含 dplayer 和 url 的文本（作为补充）
    const dplayerUrlPattern = /dplayer[\s\S]{0,2000}?url\s*[:=]\s*['"]([^'"]+)['"]/gi;
    let dplayerMatch;
    while ((dplayerMatch = dplayerUrlPattern.exec(html)) !== null) {
      if (dplayerMatch && dplayerMatch[1]) {
        addVideoUrl(dplayerMatch[1].trim());
      }
    }

    // 2. 从 post-content 中提取文案和图片
    const $postContent = $('.post-content, [class*="post-content"], article, [class*="content"]').first();
    
    if ($postContent.length > 0) {
      const $blockquote = $postContent.find('blockquote').first();
      const $dplayer = $postContent.find('.dplayer, #dplayer, [class*="dplayer"], [id*="dplayer"]').first();
      
      if ($blockquote.length > 0) {
        let $elementsToParse;
        
        if ($dplayer.length > 0) {
          $elementsToParse = $blockquote.nextUntil($dplayer);
        } else {
          $elementsToParse = $blockquote.nextAll();
        }
        
        $elementsToParse.find('p').add($elementsToParse.filter('p')).each((i, el) => {
          const $p = $(el);
          const text = $p.text().trim();
          
          if (text) {
            result.content.push({
              type: 'text',
              text: text
            });
          }
        });
        
        $elementsToParse.find('img[data-xkrkllgl]').each((i, el) => {
          const $img = $(el);
          const imageUrl = $img.attr('data-xkrkllgl');
          
          if (imageUrl) {
            const fullImageUrl = resolveUrl(imageUrl, url);
            result.images.push(fullImageUrl);
            result.content.push({
              type: 'image',
              url: fullImageUrl
            });
          }
        });
      } else {
        let $elementsToParse;
        
        if ($dplayer.length > 0) {
          $elementsToParse = $postContent.children().not($dplayer).filter((i, el) => {
            const $el = $(el);
            const allChildren = $postContent.children();
            const elIndex = allChildren.index($el);
            const dplayerIndex = allChildren.index($dplayer);
            return elIndex < dplayerIndex;
          });
        } else {
          $elementsToParse = $postContent.children();
        }
        
        $elementsToParse.find('p').add($elementsToParse.filter('p')).each((i, el) => {
          const $p = $(el);
          const text = $p.text().trim();
          
          if (text) {
            result.content.push({
              type: 'text',
              text: text
            });
          }
        });
        
        $elementsToParse.find('img[data-xkrkllgl]').each((i, el) => {
          const $img = $(el);
          const imageUrl = $img.attr('data-xkrkllgl');
          
          if (imageUrl) {
            const fullImageUrl = resolveUrl(imageUrl, url);
            result.images.push(fullImageUrl);
            result.content.push({
              type: 'image',
              url: fullImageUrl
            });
          }
        });
      }
    }

    // 去重图片数组
    result.images = [...new Set(result.images)];

    return c.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Parse detail error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to parse detail page',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, 500);
  }
};

/**
 * 解析分类链接，提取分类列表
 * @param {import('hono').Context} c
 */
const parseCategories = async (c) => {
  try {
    const url = c.req.query('url');

    if (!url) {
      return c.json({
        success: false,
        error: 'URL parameter is required'
      }, 400);
    }

    // 验证URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return c.json({
        success: false,
        error: 'Invalid URL format'
      }, 400);
    }

    // 获取HTML内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 辅助函数：将相对URL转换为绝对URL
    const resolveUrl = (relativeUrl, baseUrl) => {
      if (!relativeUrl) return '';
      
      if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl;
      }
      
      if (relativeUrl.startsWith('//')) {
        return urlObj.protocol + relativeUrl;
      }
      
      try {
        return new URL(relativeUrl, baseUrl).href;
      } catch (e) {
        console.warn('URL resolution failed:', e.message, relativeUrl, baseUrl);
        if (relativeUrl.startsWith('/')) {
          return urlObj.origin + relativeUrl;
        } else {
          const baseUrlObj = new URL(baseUrl);
          return new URL(relativeUrl, baseUrlObj.href).href;
        }
      }
    };

    const categories = [];

    // 查找 ul.list 元素
    const $list = $('ul.list');
    
    if ($list.length > 0) {
      // 遍历所有 li 元素
      $list.find('li').each((i, el) => {
        const $li = $(el);
        const $link = $li.find('a').first();
        
        if ($link.length > 0) {
          const title = $link.text().trim();
          const href = $link.attr('href');
          const isActive = $li.hasClass('active');
          
          if (title && href) {
            const fullUrl = resolveUrl(href, url);
            categories.push({
              title: title,
              url: fullUrl,
              active: isActive
            });
          }
        }
      });
    } else {
      // 如果没有找到 ul.list，尝试其他可能的选择器
      $('ul[class*="list"], .list ul, nav ul, .nav ul').each((i, ul) => {
        const $ul = $(ul);
        $ul.find('li a').each((j, el) => {
          const $link = $(el);
          const title = $link.text().trim();
          const href = $link.attr('href');
          const $li = $link.closest('li');
          const isActive = $li.hasClass('active');
          
          if (title && href) {
            const fullUrl = resolveUrl(href, url);
            // 避免重复添加
            const exists = categories.some(cat => cat.url === fullUrl);
            if (!exists) {
              categories.push({
                title: title,
                url: fullUrl,
                active: isActive
              });
            }
          }
        });
      });
    }

    return c.json({
      success: true,
      data: {
        url: url,
        categories: categories,
        total: categories.length
      }
    });

  } catch (error) {
    console.error('Parse categories error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to parse categories',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, 500);
  }
};

module.exports = {
  parsePage,
  parseDetail,
  parseCategories
};
