---
status: be-editing
---

# Nginx

> Nginx 主要的三个作用：
> - 反向代理
> - 负载均衡
> - 静态资源服务

最简单的反向代理如下:
```nginx
location / {
    proxy_pass http://127.0.0.1:7001;
}
```

配置文件解析：
```nginx
worker_processes  1;

# --- 上面部分是全局配置 ---


events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;
    keepalive_timeout  65;
  	# --- 上述部分为 http 选项的配置 ---
   
    # 负载均衡： coderjcnginx 这个名称是任意定义的
    upstream coderjcnginx {
        # server 来配置服务，weight 关键字来配置服务器权重，如果权重数值都一样，就是交替执行，平分请求
        server 127.0.0.1:7001 weight=1;
        server 127.0.0.1:7002 weight=1;
    }
	
  	# --- server 可以存在多个 ---
    server {
        listen       80;
        server_name  localhost;
				
    		# 当访问 80 端口的根目录时，会走到这个配置
        location / {
            root  html;
            index index.html index.htm;
            # 可能是这个服务器是 119xxxxx
      
            # 如果这个代理的服务器有多个，那么就可以代理到负载均衡下面, http://[与上面的负载均衡配置的名称保持一致]
            proxy_pass http://coderjcnginx;
        }
    
        # 也可以配置多个，比如有些站点的后台就是加一个 admin 的后缀
        location /admin {
            # 可能这个服务器是 178xxxxxx
        }
    }

    # HTTPS server
    #
    server {
        listen       443 ssl;
        server_name  localhost;
    }

}
```









