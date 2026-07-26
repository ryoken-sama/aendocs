use crate::errors::AppError;
use keyring::Entry;

const SERVICE: &str = "AEN Docs";

fn entry(email: &str) -> Result<Entry, AppError> {
    Ok(Entry::new(SERVICE, email)?)
}

pub fn set_password(email: &str, password: &str) -> Result<(), AppError> {
    entry(email)?.set_password(password)?;
    Ok(())
}

pub fn get_password(email: &str) -> Result<Option<String>, AppError> {
    match entry(email)?.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn delete_password(email: &str) -> Result<(), AppError> {
    match entry(email)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.into()),
    }
}
