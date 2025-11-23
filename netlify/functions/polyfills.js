/**
 * Netlify Functions 环境 Polyfills
 * 
 * 这个文件提供 Netlify Functions 环境中缺失的 Web API polyfills
 * 必须在任何其他模块导入之前被加载
 */

/**
 * File API Polyfill
 * 
 * axios 1.6+ 使用 undici，undici 的 webidl 模块在加载时会检查 File API
 * 如果 File 不存在，会导致 "File is not defined" 错误
 * 
 * 这个 polyfill 提供一个最小化的 File 实现，满足 undici 的基本需求
 */
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(bits = [], name = '', options = {}) {
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
      this.size = Array.isArray(bits) ? bits.length : (bits && bits.length ? bits.length : 0);
      this.type = options.type || '';
      this._bits = bits;
    }
    
    stream() {
      const { Readable } = require('stream');
      const bits = this._bits || [];
      return Readable.from([Buffer.from(bits)]);
    }
    
    async arrayBuffer() {
      const bits = this._bits || [];
      return Buffer.from(bits).buffer;
    }
    
    async text() {
      const bits = this._bits || [];
      return Buffer.from(bits).toString('utf8');
    }
    
    slice(start = 0, end = this.size) {
      const bits = this._bits || [];
      return new File(bits.slice(start, end), this.name, { type: this.type });
    }
  };
  
  // 确保 File 在所有全局作用域中可用
  if (typeof globalThis !== 'undefined') {
    globalThis.File = global.File;
  }
  
  if (typeof window !== 'undefined') {
    window.File = global.File;
  }
}

module.exports = {};

