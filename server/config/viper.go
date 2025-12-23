package config

import (
	"os"

	"github.com/spf13/viper"
	"log"
)

type EnvVars struct {
	AUTH0_DOMAIN    string `mapstructure:"AUTH0_DOMAIN"`
	AUTH0_AUDIENCE  string `mapstructure:"AUTH0_AUDIENCE"`
	INFLUXDB_URL    string `mapstructure:"INFLUXDB_URL"`
	INFLUXDB_TOKEN  string `mapstructure:"INFLUXDB_TOKEN"`
	INFLUXDB_ORG    string `mapstructure:"INFLUXDB_ORG"`
	INFLUXDB_BUCKET string `mapstructure:"INFLUXDB_BUCKET"`

	DB_USERNAME string `mapstructure:"DB_USERNAME"`
	DB_PASSWORD string `mapstructure:"DB_PASSWORD"`
	DB_HOST     string `mapstructure:"DB_HOST"`
	DB_PORT     string `mapstructure:"DB_PORT"`
	DB_DATABASE string `mapstructure:"DB_DATABASE"`
	DB_SCHEMA   string `mapstructure:"DB_SCHEMA"`

	CLERK_SECRET_KEY string `mapstructure:"CLERK_SECRET_KEY"`

	CHIRPSTACK_API_URL           string `mapstructure:"CHIRPSTACK_API_URL"`
	CHIRPSTACK_API_TOKEN         string `mapstructure:"CHIRPSTACK_API_TOKEN"`
	CHIRPSTACK_APPLICATION_ID    string `mapstructure:"CHIRPSTACK_APPLICATION_ID"`
	CHIRPSTACK_DEVICE_PROFILE_ID string `mapstructure:"CHIRPSTACK_DEVICE_PROFILE_ID"`
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
	if config.INFLUXDB_URL == "" {
		config.INFLUXDB_URL = os.Getenv("INFLUXDB_URL")
	}
	if config.INFLUXDB_TOKEN == "" {
		config.INFLUXDB_TOKEN = os.Getenv("INFLUXDB_TOKEN")
	}
	if config.INFLUXDB_ORG == "" {
		config.INFLUXDB_ORG = os.Getenv("INFLUXDB_ORG")
	}
	if config.INFLUXDB_BUCKET == "" {
		config.INFLUXDB_BUCKET = os.Getenv("INFLUXDB_BUCKET")
	}
	if config.CLERK_SECRET_KEY == "" {
		config.CLERK_SECRET_KEY = os.Getenv("CLERK_SECRET_KEY")
	}
	if config.CHIRPSTACK_API_TOKEN == "" {
		config.CHIRPSTACK_API_TOKEN = os.Getenv("CHIRPSTACK_API_TOKEN")
	}
	if config.CHIRPSTACK_APPLICATION_ID == "" {
		config.CHIRPSTACK_APPLICATION_ID = os.Getenv("CHIRPSTACK_APPLICATION_ID")
	}
	if config.CHIRPSTACK_DEVICE_PROFILE_ID == "" {
		config.CHIRPSTACK_DEVICE_PROFILE_ID = os.Getenv("CHIRPSTACK_DEVICE_PROFILE_ID")
	}

	return
}
