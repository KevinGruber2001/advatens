package config

import (
	"os"

	"log"

	"github.com/spf13/viper"
)

type EnvVars struct {
	MQTT_BROKER_URL string `mapstructure:"MQTT_BROKER_URL"`

	DB_USERNAME string `mapstructure:"DB_USERNAME"`
	DB_PASSWORD string `mapstructure:"DB_PASSWORD"`
	DB_HOST     string `mapstructure:"DB_HOST"`
	DB_PORT     string `mapstructure:"DB_PORT"`
	DB_DATABASE string `mapstructure:"DB_DATABASE"`
	DB_SCHEMA   string `mapstructure:"DB_SCHEMA"`

	CLERK_SECRET_KEY string `mapstructure:"CLERK_SECRET_KEY"`

	CORS_ALLOWED_ORIGINS string `mapstructure:"CORS_ALLOWED_ORIGINS"`

	CHIRPSTACK_API_URL        string `mapstructure:"CHIRPSTACK_API_URL"`
	CHIRPSTACK_API_TOKEN      string `mapstructure:"CHIRPSTACK_API_TOKEN"`
	CHIRPSTACK_ADMIN_EMAIL    string `mapstructure:"CHIRPSTACK_ADMIN_EMAIL"`
	CHIRPSTACK_ADMIN_PASSWORD string `mapstructure:"CHIRPSTACK_ADMIN_PASSWORD"`
}

func LoadConfig() (config EnvVars, err error) {
	viper.AddConfigPath(".")
	viper.SetConfigName("app")
	viper.SetConfigType("env")

	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		log.Println("No config file found, using environment variables")
	}

	err = viper.Unmarshal(&config)

	// Fallback: if viper didn't load the env vars, read directly from os.Getenv
	// This ensures environment variables always work in Docker
	if config.CHIRPSTACK_API_URL == "" {
		config.CHIRPSTACK_API_URL = os.Getenv("CHIRPSTACK_API_URL")
	}
	if config.DB_HOST == "" {
		config.DB_HOST = os.Getenv("DB_HOST")
	}
	if config.DB_PORT == "" {
		config.DB_PORT = os.Getenv("DB_PORT")
	}
	if config.DB_USERNAME == "" {
		config.DB_USERNAME = os.Getenv("DB_USERNAME")
	}
	if config.DB_PASSWORD == "" {
		config.DB_PASSWORD = os.Getenv("DB_PASSWORD")
	}
	if config.DB_DATABASE == "" {
		config.DB_DATABASE = os.Getenv("DB_DATABASE")
	}
	if config.DB_SCHEMA == "" {
		config.DB_SCHEMA = os.Getenv("DB_SCHEMA")
	}
	if config.MQTT_BROKER_URL == "" {
		config.MQTT_BROKER_URL = os.Getenv("MQTT_BROKER_URL")
	}
	if config.CLERK_SECRET_KEY == "" {
		config.CLERK_SECRET_KEY = os.Getenv("CLERK_SECRET_KEY")
	}
	if config.CORS_ALLOWED_ORIGINS == "" {
		config.CORS_ALLOWED_ORIGINS = os.Getenv("CORS_ALLOWED_ORIGINS")
	}
	if config.CHIRPSTACK_API_TOKEN == "" {
		config.CHIRPSTACK_API_TOKEN = os.Getenv("CHIRPSTACK_API_TOKEN")
	}
	if config.CHIRPSTACK_ADMIN_EMAIL == "" {
		config.CHIRPSTACK_ADMIN_EMAIL = os.Getenv("CHIRPSTACK_ADMIN_EMAIL")
	}
	if config.CHIRPSTACK_ADMIN_PASSWORD == "" {
		config.CHIRPSTACK_ADMIN_PASSWORD = os.Getenv("CHIRPSTACK_ADMIN_PASSWORD")
	}

	return
}
