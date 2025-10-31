/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/socket.io/:path*',
        destination: 'http://localhost:4001/socket.io/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:4001/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig