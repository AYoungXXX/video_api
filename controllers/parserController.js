const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 解析网页内容，提取post-card信息和分页器数据
 */
const parsePage = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }

    // 验证URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
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
        // 如果relativeUrl以/开头，会被视为相对于baseUrl的根路径
        // 例如: /archives/97163/ + https://wiki.ndyechuz.cc/ 
        // 结果: https://wiki.ndyechuz.cc/archives/97163/
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
      
      // 提取标题 - 优先使用已知的选择器
      let title = $card.find('h2.post-card-title, h2[itemprop="headline"], h3[itemprop="headline"]').first().text().trim() ||
                  $card.find('[itemprop="headline"]').first().text().trim() ||
                  $card.find('h2, h3, .title, [class*="title"]').first().text().trim() || '';
      
      // 提取跳转链接 - 优先查找包含/archives/的链接
      let link = '';
      
      // 方法1: 查找包含整个post-card的a标签（最常见的情况）
      // 这个a标签通常包含整个post-card结构
      const $outerLink = $card.find('> a[href*="/archives/"]').first();
      if ($outerLink.length > 0) {
        link = $outerLink.attr('href') || '';
      }
      
      // 方法2: 查找包含/archives/的链接（任何位置）
      if (!link) {
        const $archivesLink = $card.find('a[href*="/archives/"]').first();
        if ($archivesLink.length > 0) {
          link = $archivesLink.attr('href') || '';
        }
      }
      
      // 方法3: 从meta标签中提取（itemprop="url mainEntityOfPage"）
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
        // 确保提取的是href属性值，不是文本内容
        link = link.trim();
        // 使用resolveUrl函数合并URL
        fullLink = resolveUrl(link, url);
      }
      
      // 提取图片链接 - 优先从loadBannerDirect函数调用中提取
      let imageUrl = '';
      
      // 方法1: 从loadBannerDirect函数调用中提取
      const cardHtml = $card.html() || '';
      const loadBannerMatch = cardHtml.match(/loadBannerDirect\s*\(\s*['"]([^'"]+)['"]/);
      if (loadBannerMatch && loadBannerMatch[1]) {
        imageUrl = loadBannerMatch[1];
      }
      
      // 方法2: 从img标签中提取
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
      
      // 方法3: 从onclick或其他事件属性中提取
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
        
      // 提取发布时间 - 查找包含日期的文本
      let publishTime = '';
      // 查找日期相关的元素
      const dateText = $card.find('.date, .time, time, [class*="date"], [class*="time"]').first().text().trim() || 
                      $card.find('time').attr('datetime') || '';
      if (dateText) {
        publishTime = dateText;
      } else {
        // 尝试从卡片文本中提取日期模式
        const cardText = $card.text();
        const dateMatch = cardText.match(/(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)/);
        if (dateMatch) {
          publishTime = dateMatch[1];
        }
      }
      
      // 提取作者 - 优先从meta标签的content属性中提取
      let author = '';
      
      // 方法1: 从itemprop="author"容器内的meta[itemprop="name"]标签中提取content
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
      
      // 方法2: 如果方法1失败，尝试直接从meta标签中查找（可能在article级别）
      if (!author) {
        const $authorMeta = $card.find('meta[itemprop="author"] meta[itemprop="name"], [itemprop="author"] meta[itemprop="name"]').first();
        if ($authorMeta.length > 0) {
          author = $authorMeta.attr('content') || '';
          if (author) {
            author = author.trim();
          }
        }
      }
      
      // 方法3: 从span或其他元素中提取作者文本
      if (!author) {
        const $authorEl = $card.find('span[itemprop="author"], [itemprop="author"] span').first();
        if ($authorEl.length > 0) {
          author = $authorEl.text().trim().replace(/[•·]/g, '').trim();
        }
      }
      
      // 方法4: 从其他作者相关的元素中提取
      if (!author) {
        const authorText = $card.find('.author, [class*="author"], .by, [class*="by"]').first().text().trim() || '';
        if (authorText) {
          author = authorText.replace(/[•·]/g, '').trim();
        }
      }
      
      // 方法5: 尝试从文本中提取作者（通常在"作者名 •"这样的格式中）
      if (!author) {
        const cardText = $card.text();
        // 匹配"作者名 •"或"作者名 ·"格式
        const authorMatch = cardText.match(/([^\s•·\n]{2,15}?)\s*[•·]/);
        if (authorMatch && authorMatch[1].trim().length >= 2 && authorMatch[1].trim().length < 20) {
          const potentialAuthor = authorMatch[1].trim();
          // 验证是否是常见的作者名格式（中文名，不包含日期等）
          if (!potentialAuthor.match(/^\d/) && 
              !potentialAuthor.match(/年|月|日/) &&
              potentialAuthor.match(/[\u4e00-\u9fa5]/)) {
            author = potentialAuthor;
          }
        }
      }
        
      // 提取分类 - 优先查找包含逗号的span（如"今日吃瓜, 深夜撸片"）
      const categories = [];
      
      // 方法1: 查找包含逗号的span（这是最常见的分类格式）
      $card.find('span').each((i, el) => {
        const $el = $(el);
        const categoryText = $el.text().trim();
        const categoryClass = $el.attr('class') || '';
        
        // 如果包含逗号，很可能是分类
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
          // 单个分类（不包含逗号）
          const cleanText = categoryText.replace(/[•·]/g, '').trim();
          if (cleanText && !categories.includes(cleanText)) {
            categories.push(cleanText);
          }
        }
      });
      
      // 方法2: 从链接URL中提取分类
      if (link) {
        const categoryMatch = link.match(/\/category\/([^\/]+)/);
        if (categoryMatch && categoryMatch[1]) {
          const categoryFromUrl = decodeURIComponent(categoryMatch[1]);
          if (!categories.includes(categoryFromUrl)) {
            categories.push(categoryFromUrl);
          }
        }
      }
      
      // 方法3: 从其他元素中提取分类
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
      
      // 如果找到了标题或链接，添加到结果中
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
    
    // 策略2: 如果策略1没有找到足够的内容，尝试查找.post-card等标准结构
    if (posts.length === 0) {
      $('.post-card, article, .post, .item, [class*="card"], [class*="post-item"]').each((index, element) => {
        const $card = $(element);
        
        // 提取图片
        let imageUrl = $card.find('img').first().attr('src') || 
                       $card.find('img').first().attr('data-src') || 
                       $card.find('img').first().attr('data-lazy-src') || '';
        if (imageUrl) {
          imageUrl = resolveUrl(imageUrl, url);
        }
        
        // 提取链接
        let link = $card.find('a[href*="/archives/"]').first().attr('href') ||
                   $card.find('h2 a, h3 a').first().attr('href') ||
                   $card.find('a').first().attr('href') || '';
        const fullLink = link ? resolveUrl(link, url) : '';
        
        // 提取标题
        const title = $card.find('h2, h3, .title, a').first().text().trim() || '';
        
        // 提取发布时间
        const publishTime = $card.find('.date, .time, time').first().text().trim() || 
                           $card.find('time').attr('datetime') || '';
        
        // 提取作者
        const author = $card.find('.author, [class*="author"]').first().text().trim() || '';
        
        // 提取分类
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
      // 提取当前页和总页数 - 优先从.page-info中提取（格式：当前页/总页数）
      let currentPage = '';
      let totalPages = '';
      
      const pageInfoText = $pageNav.find('.page-info').first().text().trim();
      if (pageInfoText) {
        // 匹配格式：2/749 或 2 / 749
        const pageInfoMatch = pageInfoText.match(/(\d+)\s*\/\s*(\d+)/);
        if (pageInfoMatch) {
          currentPage = pageInfoMatch[1];
          totalPages = pageInfoMatch[2];
        }
      }
      
      // 如果从page-info中没提取到，尝试其他方法
      if (!currentPage) {
        currentPage = $pageNav.find('.current, .active, [class*="current"]').text().trim() || 
                     $pageNav.find('a.active, li.active a').text().trim() || 
                     $pageNav.find('li.active').text().trim() || '1';
      }
      
      if (!totalPages) {
        totalPages = $pageNav.find('.total, [class*="total"]').text().trim() || 
                    $pageNav.text().match(/\/(\d+)/)?.[1] || '';
      }
      
      // 提取所有分页链接（排除上一页和下一页）
      const pageLinks = [];
      $pageNav.find('.page-navigator a, ul a, .pagination a').each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().trim();
        const $parent = $link.parent();
        
        // 排除上一页和下一页链接
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

      // 提取上一页 - 从.prev li中的a标签提取
      let prevPage = null;
      const $prevLink = $pageNav.find('li.prev a, .prev a, [class*="prev"] a').first();
      if ($prevLink.length > 0) {
        const prevHref = $prevLink.attr('href');
        if (prevHref) {
          prevPage = resolveUrl(prevHref, url);
        }
      }
      
      // 如果没找到，尝试通过alt属性查找（图片链接）
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
      
      // 提取下一页 - 从.next li中的a标签提取
      let nextPage = null;
      const $nextLink = $pageNav.find('li.next a, .next a, [class*="next"] a').first();
      if ($nextLink.length > 0) {
        const nextHref = $nextLink.attr('href');
        if (nextHref) {
          nextPage = resolveUrl(nextHref, url);
        }
      }
      
      // 如果没找到，尝试通过alt属性查找（图片链接）
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
      // 如果没有找到.page-nav，尝试其他分页器选择器
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
          
          // 排除上一页和下一页链接
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

        // 提取上一页和下一页
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
      // 过滤条件1: 链接必须包含/archives/（真正的文章链接）
      if (post.link && !post.link.includes('/archives/')) {
        return false;
      }
      
      // 过滤条件2: 必须有标题且标题长度合理（至少5个字符）
      if (!post.title || post.title.length < 5 || post.title === '无标题') {
        return false;
      }
      
      // 过滤条件3: 链接不能指向外部域名（广告通常指向外部）
      if (post.link) {
        try {
          const postUrl = new URL(post.link);
          const baseUrl = new URL(url);
          // 如果链接的域名与基础URL的域名不同，可能是广告
          if (postUrl.hostname !== baseUrl.hostname && 
              postUrl.hostname !== urlObj.hostname) {
            return false;
          }
        } catch (e) {
          // URL解析失败，保留
        }
      }
      
      // 过滤条件4: 标题不能是明显的广告关键词
      const adKeywords = ['广告', '推广', '赞助', 'advertisement', 'ad', 'sponsor', 'promo'];
      const titleLower = post.title.toLowerCase();
      if (adKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
        return false;
      }
      
      // 过滤条件5: 必须有链接（没有链接的可能是无效内容）
      if (!post.link || post.link.length === 0) {
        return false;
      }
      
      return true;
    });
    
    // 重新设置索引
    filteredPosts.forEach((post, index) => {
      post.index = index + 1;
    });

    res.json({
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
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse page',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * 解析详情页内容，提取视频链接、文案和图片
 */
const parseDetail = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }

    // 验证URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
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
      videoUrl: '',
      content: [],
      images: []
    };

    // 1. 从 dplayer 中提取 video.url 链接
    // 方法1: 查找 dplayer 容器，从 data-config 属性中提取（JSON格式）
    const $dplayer = $('.dplayer, #dplayer, [class*="dplayer"], [id*="dplayer"]').first();
    
    if ($dplayer.length > 0) {
      // 尝试从 data-config 属性中提取（这是最常见的格式）
      const dataConfig = $dplayer.attr('data-config');
      if (dataConfig) {
        try {
          const config = JSON.parse(dataConfig);
          if (config && config.video && config.video.url) {
            result.videoUrl = resolveUrl(config.video.url, url);
          }
        } catch (e) {
          console.warn('Failed to parse data-config:', e.message);
        }
      }
      
      // 如果还没找到，尝试其他 data 属性
      if (!result.videoUrl) {
        const videoData = $dplayer.attr('data-video') || 
                         $dplayer.attr('data-url') ||
                         $dplayer.attr('data-src');
        
        if (videoData) {
          try {
            const videoObj = JSON.parse(videoData);
            if (videoObj && videoObj.url) {
              result.videoUrl = resolveUrl(videoObj.url, url);
            }
          } catch (e) {
            // 如果不是 JSON，直接使用
            result.videoUrl = resolveUrl(videoData, url);
          }
        }
      }
    }

    // 方法2: 从 script 标签中提取 dplayer 初始化代码中的 video.url
    if (!result.videoUrl) {
      $('script').each((i, el) => {
        const scriptContent = $(el).html() || '';
        if (!scriptContent) return;
        
        // 匹配 new DPlayer({ video: { url: "..." } }) 格式
        // 支持多行匹配，使用 [\s\S] 来匹配包括换行符在内的所有字符
        const patterns = [
          // 匹配 video: { url: "..." } 格式（单行或多行）
          /video\s*:\s*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/,
          // 匹配 video.url = "..." 格式
          /video\.url\s*=\s*['"]([^'"]+)['"]/,
          // 匹配 "url": "..." 在 video 对象中
          /video\s*:\s*\{[\s\S]*?["']url["']\s*:\s*['"]([^'"]+)['"]/,
          // 匹配 DPlayer 初始化中的 url
          /new\s+DPlayer\s*\([\s\S]*?video\s*:\s*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/
        ];
        
        for (const pattern of patterns) {
          const match = scriptContent.match(pattern);
          if (match && match[1]) {
            const videoUrl = match[1].trim();
            // 验证是否是有效的 URL
            if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('//') || videoUrl.startsWith('/'))) {
              result.videoUrl = resolveUrl(videoUrl, url);
              return false; // break
            }
          }
        }
      });
    }

    // 方法3: 从整个 HTML 文本中搜索（作为最后的手段）
    if (!result.videoUrl) {
      // 搜索包含 dplayer 和 url 的文本
      const htmlText = html;
      const dplayerMatch = htmlText.match(/dplayer[\s\S]{0,2000}?url\s*[:=]\s*['"]([^'"]+)['"]/i);
      if (dplayerMatch && dplayerMatch[1]) {
        const videoUrl = dplayerMatch[1].trim();
        if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('//') || videoUrl.startsWith('/'))) {
          result.videoUrl = resolveUrl(videoUrl, url);
        }
      }
    }

    // 2. 从 post-content 中提取文案和图片
    const $postContent = $('.post-content, [class*="post-content"], article, [class*="content"]').first();
    
    if ($postContent.length > 0) {
      // 查找 blockquote 元素
      const $blockquote = $postContent.find('blockquote').first();
      
      // 查找 dplayer 元素（用于确定停止解析的位置）
      const $dplayer = $postContent.find('.dplayer, #dplayer, [class*="dplayer"], [id*="dplayer"]').first();
      
      if ($blockquote.length > 0) {
        // 确定要提取的元素范围：blockquote 之后，dplayer 之前
        let $elementsToParse;
        
        if ($dplayer.length > 0) {
          // 如果 dplayer 存在，只提取 blockquote 和 dplayer 之间的兄弟节点
          // 使用 nextUntil 获取两个元素之间的所有兄弟节点
          $elementsToParse = $blockquote.nextUntil($dplayer);
        } else {
          // 如果 dplayer 不存在，提取 blockquote 后面的所有兄弟节点
          $elementsToParse = $blockquote.nextAll();
        }
        
        // 提取 p 标签的文案
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
        
        // 提取 img 标签的图片（data-xkrkllgl 属性在 img 标签上）
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
        // 如果没有 blockquote，从开头提取，但遇到 dplayer 就停止
        let $elementsToParse;
        
        if ($dplayer.length > 0) {
          // 如果 dplayer 存在，只提取 dplayer 之前的所有子元素
          $elementsToParse = $postContent.children().not($dplayer).filter((i, el) => {
            const $el = $(el);
            // 检查元素是否在 dplayer 之前
            const allChildren = $postContent.children();
            const elIndex = allChildren.index($el);
            const dplayerIndex = allChildren.index($dplayer);
            return elIndex < dplayerIndex;
          });
        } else {
          // 如果 dplayer 不存在，提取所有内容
          $elementsToParse = $postContent.children();
        }
        
        // 提取 p 标签的文案
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
        
        // 提取 img 标签的图片
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

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Parse detail error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse detail page',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * 解析分类链接，提取分类列表
 */
const parseCategories = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }

    // 验证URL格式
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
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

    res.json({
      success: true,
      data: {
        url: url,
        categories: categories,
        total: categories.length
      }
    });

  } catch (error) {
    console.error('Parse categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse categories',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  parsePage,
  parseDetail,
  parseCategories
};

